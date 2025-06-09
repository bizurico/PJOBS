from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

# 1) Caminho absoluto para a pasta Backend (onde está este app.py)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 2) O arquivo SQLite ficará em Backend/pjobs.db
DB_PATH = os.path.join(BASE_DIR, "pjobs.db")

# ------ Configuração do Flask para servir arquivos estáticos ------
# static_folder="../Frontend": diz ao Flask para procurar todos os arquivos estáticos (HTML, JS, CSS) dentro de ../Frontend
# static_url_path=""       : faz com que qualquer URL “/arquivo” seja servido de Frontend/arquivo
app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, "../Frontend"),
    static_url_path=""
)
CORS(app)

# --------------- Função de conexão com o banco SQLite ---------------
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # para podermos acessar colunas por nome
    return conn

# --------------- Criar as tabelas se ainda não existirem -------------
def criar_tabelas_se_nao_existirem():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Tabela de usuários
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        cpf TEXT NOT NULL UNIQUE,
        senha TEXT NOT NULL,
        tipo TEXT NOT NULL,          -- 'cliente' ou 'prestador'
        area TEXT,                    -- preenchido apenas para prestador
        cidade TEXT,
        contato TEXT
    );
    """)

    # Tabela de histórico de contratações
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_cpf TEXT NOT NULL,
        profissional_cpf TEXT NOT NULL,
        area TEXT NOT NULL,
        descricao TEXT NOT NULL,
        data TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

# --------------------- Rotas para servir estáticos ---------------------
@app.route('/')
def index():
    # Quando acessar http://localhost:5000/, devolve Frontend/index.html
    return app.send_static_file('index.html')

# Todos os outros arquivos (cadastro.html, cliente.html, script.js, styles.css)
# ficam disponíveis em http://localhost:5000/cadastro.html, /script.js, etc., 
# porque definimos static_folder="../Frontend" e static_url_path="".

# ------------------------ Rotas da API (SQLite) ------------------------

@app.route('/cadastro', methods=['POST'])
def cadastrar_usuario():
    dados = request.json or {}
    nome    = dados.get("nome", "").strip()
    email   = dados.get("email", "").strip()
    cpf     = dados.get("cpf", "").strip()
    senha   = dados.get("senha", "").strip()
    tipo    = dados.get("tipo", "").strip()       # 'cliente' ou 'prestador'
    area    = dados.get("area", "").strip() or None
    cidade  = dados.get("cidade", "").strip() or None
    contato = dados.get("contato", "").strip() or None

    # Validação básica
    if not (nome and email and cpf and senha and tipo):
        return jsonify({"erro": "Faltam campos obrigatórios"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Verifica duplicata por CPF ou e-mail
    cursor.execute("SELECT 1 FROM usuarios WHERE cpf = ? OR email = ?", (cpf, email))
    if cursor.fetchone():
        conn.close()
        return jsonify({"erro": "Usuário já existe"}), 400

    # Inserir novo usuário
    cursor.execute("""
        INSERT INTO usuarios (nome, email, cpf, senha, tipo, area, cidade, contato)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (nome, email, cpf, senha, tipo, area, cidade, contato))

    conn.commit()
    conn.close()
    return jsonify({"mensagem": "Usuário cadastrado com sucesso"}), 201


@app.route('/login', methods=['POST'])
def login():
    dados = request.json or {}
    email = dados.get("email", "").strip()
    senha = dados.get("senha", "").strip()

    if not (email and senha):
        return jsonify({"erro": "Email e senha são obrigatórios"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT tipo FROM usuarios WHERE email = ? AND senha = ?",
        (email, senha)
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        return jsonify({"mensagem": "Login realizado com sucesso", "tipo": row["tipo"]}), 200
    else:
        return jsonify({"erro": "Email ou senha inválidos"}), 401


@app.route('/profissionais', methods=['GET'])
def listar_profissionais():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nome, cpf, area, cidade, contato FROM usuarios WHERE tipo = 'prestador'")
    rows = cursor.fetchall()
    conn.close()

    profissionais = []
    for r in rows:
        profissionais.append({
            "nome":    r["nome"],
            "cpf":     r["cpf"],
            "area":    r["area"],
            "cidade":  r["cidade"],
            "contato": r["contato"]
        })
    return jsonify(profissionais), 200


@app.route('/contratar', methods=['POST'])
def contratar():
    dados = request.json or {}
    cliente_cpf      = dados.get("cliente", "").strip()
    profissional_cpf = dados.get("profissional", "").strip()
    area             = dados.get("area", "").strip()
    descricao        = dados.get("descricao", "").strip()
    data_hora        = datetime.now().strftime("%Y-%m-%d %H:%M")

    if not (cliente_cpf and profissional_cpf and area and descricao):
        return jsonify({"erro": "Faltam dados para contratação"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Verifica se cliente e prestador existem
    cursor.execute("SELECT 1 FROM usuarios WHERE cpf = ? AND tipo = 'cliente'", (cliente_cpf,))
    existe_cliente = cursor.fetchone()
    cursor.execute("SELECT 1 FROM usuarios WHERE cpf = ? AND tipo = 'prestador'", (profissional_cpf,))
    existe_profissional = cursor.fetchone()

    if not existe_cliente or not existe_profissional:
        conn.close()
        return jsonify({"erro": "Cliente ou prestador não encontrados"}), 404

    cursor.execute("""
        INSERT INTO historico (cliente_cpf, profissional_cpf, area, descricao, data)
        VALUES (?, ?, ?, ?, ?)
    """, (cliente_cpf, profissional_cpf, area, descricao, data_hora))

    conn.commit()
    conn.close()
    return jsonify({"mensagem": "Serviço contratado com sucesso"}), 201


@app.route('/historico/<cpf>', methods=['GET'])
def obter_historico(cpf):
    cpf = cpf.strip()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT tipo FROM usuarios WHERE cpf = ?", (cpf,))
    usuario = cursor.fetchone()
    if not usuario:
        conn.close()
        return jsonify({"erro": "Usuário não encontrado"}), 404

    tipo = usuario["tipo"]
    if tipo == "cliente":
        cursor.execute(
            "SELECT cliente_cpf, profissional_cpf, area, descricao, data FROM historico WHERE cliente_cpf = ?",
            (cpf,)
        )
    else:
        cursor.execute(
            "SELECT cliente_cpf, profissional_cpf, area, descricao, data FROM historico WHERE profissional_cpf = ?",
            (cpf,)
        )

    registros = cursor.fetchall()
    conn.close()

    lista = []
    for h in registros:
        lista.append({
            "cliente":       h["cliente_cpf"],
            "profissional":  h["profissional_cpf"],
            "area":          h["area"],
            "descricao":     h["descricao"],
            "data":          h["data"]
        })
    return jsonify(lista), 200


if __name__ == '__main__':
    # Cria as tabelas (se ainda não existirem) antes de iniciar o servidor
    criar_tabelas_se_nao_existirem()
    app.run(debug=True)
