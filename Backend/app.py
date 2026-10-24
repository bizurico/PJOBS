from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room
import sqlite3, os
from datetime import datetime

# --- Configuração Inicial ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "pjobs.db")

app = Flask(__name__)
app.config['SECRET_KEY'] = 'uma-chave-secreta-muito-forte!' # Necessário para SocketIO
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- Criação do Banco de Dados ---
def criar_tabelas_se_nao_existirem():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Tabela de Usuários (sem alterações)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      cpf TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      tipo TEXT NOT NULL,      -- 'cliente' ou 'prestador'
      area TEXT,
      cidade TEXT,
      contato TEXT
    );
    """)

    # Tabela de Solicitações (sem alterações)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS solicitacoes (
      id_solicitacao      INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_cpf         TEXT    NOT NULL,
      profissional_cpf    TEXT    NOT NULL,
      area                TEXT    NOT NULL,
      descricao_servico   TEXT    NOT NULL,
      data_solicitacao    TEXT    NOT NULL,
      status              TEXT    NOT NULL,
      FOREIGN KEY(cliente_cpf) REFERENCES usuarios(cpf),
      FOREIGN KEY(profissional_cpf) REFERENCES usuarios(cpf)
    );
    """)

    # ### ALTERADO ### Tabela de Avaliações para ser de mão dupla
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id_avaliacao      INTEGER PRIMARY KEY AUTOINCREMENT,
      id_solicitacao    INTEGER NOT NULL,
      cpf_avaliador     TEXT    NOT NULL, -- Quem está dando a nota
      cpf_avaliado      TEXT    NOT NULL, -- Quem está recebendo a nota
      nota              INTEGER NOT NULL,
      comentario        TEXT,
      data_avaliacao    TEXT    NOT NULL,
      FOREIGN KEY(id_solicitacao) REFERENCES solicitacoes(id_solicitacao),
      FOREIGN KEY(cpf_avaliador) REFERENCES usuarios(cpf),
      FOREIGN KEY(cpf_avaliado) REFERENCES usuarios(cpf)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversas (
        id_conversa         INTEGER PRIMARY KEY AUTOINCREMENT,
        cpf_participante1   TEXT NOT NULL,
        cpf_participante2   TEXT NOT NULL,
        FOREIGN KEY(cpf_participante1) REFERENCES usuarios(cpf),
        FOREIGN KEY(cpf_participante2) REFERENCES usuarios(cpf)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mensagens (
        id_mensagem     INTEGER PRIMARY KEY AUTOINCREMENT,
        id_conversa     INTEGER NOT NULL,
        cpf_remetente   TEXT NOT NULL,
        conteudo        TEXT NOT NULL,
        data_envio      TEXT NOT NULL,
        FOREIGN KEY(id_conversa) REFERENCES conversas(id_conversa),
        FOREIGN KEY(cpf_remetente) REFERENCES usuarios(cpf)
    );
    """)

    cursor.execute("DROP TABLE IF EXISTS historico")

    conn.commit()
    conn.close()

# --- Endpoints ---
@app.route('/')
def home():
    return "TESTE DE ALTERAÇÃO"

# CADASTRO E LOGIN (sem alterações significativas)
@app.route('/cadastro', methods=['POST'])
def cadastrar_usuario():
    # ... seu código de cadastro aqui (ele já está bom) ...
    d = request.json or {}
    nome = d.get("nome","").strip()
    email = d.get("email","").strip()
    cpf = d.get("cpf","").strip()
    senha = d.get("senha","").strip()
    tipo = d.get("tipo","").strip()
    area = d.get("area","").strip() or None
    cidade = d.get("cidade","").strip() or None
    contato = d.get("contato","").strip() or None
    if not (nome and email and cpf and senha and tipo):
        return jsonify({"erro":"Faltam campos obrigatórios"}),400
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("SELECT 1 FROM usuarios WHERE cpf=? OR email=?", (cpf,email))
    if cur.fetchone():
        conn.close()
        return jsonify({"erro":"Usuário já existe"}),400
    cur.execute(
      "INSERT INTO usuarios (nome,email,cpf,senha,tipo,area,cidade,contato) VALUES (?,?,?,?,?,?,?,?)",
      (nome,email,cpf,senha,tipo,area,cidade,contato)
    )
    conn.commit(); conn.close()
    return jsonify({
      "mensagem": "Usuário cadastrado com sucesso", "nome": nome, "cpf": cpf, "tipo": tipo
    }),201

@app.route('/login', methods=['POST'], strict_slashes=False)
def login():
    d = request.json or {}
    email = d.get("email","").strip()
    senha = d.get("senha","").strip()
    if not (email and senha):
        return jsonify({"erro":"Email e senha são obrigatórios"}),400
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("SELECT cpf,tipo,nome FROM usuarios WHERE email=? AND senha=?",(email,senha))
    row = cur.fetchone(); conn.close()
    if not row:
        return jsonify({"erro":"Email ou senha inválidos"}),401
    return jsonify(dict(row)),200


# ### ALTERADO ### Endpoint de profissionais mais eficiente (evita N+1 query)
@app.route('/profissionais', methods=['GET'])
def listar_profissionais():
    conn = get_db_connection()
    cur = conn.cursor()

    # ### CONSULTA SQL INTELIGENTE ###
    # Esta consulta faz tudo em uma única chamada ao banco de dados:
    # 1. Pega os dados dos usuários que são 'prestador'.
    # 2. Usa LEFT JOIN para conectar com as avaliações (mesmo que não haja nenhuma).
    # 3. Agrupa os resultados por profissional.
    # 4. Calcula a MÉDIA (AVG) da nota e a CONTAGEM (COUNT) de avaliações para cada um.
    cur.execute("""
        SELECT
            u.cpf, u.nome, u.area, u.cidade, u.contato,
            AVG(a.nota) as nota_media,
            COUNT(a.id_avaliacao) as total_avaliacoes
        FROM usuarios u
        LEFT JOIN avaliacoes a ON u.cpf = a.cpf_avaliado
        WHERE u.tipo = 'prestador'
        GROUP BY u.cpf
    """)
    
    profissionais_raw = cur.fetchall()
    conn.close()

    # Formata a saída para o JSON final
    profissionais_final = []
    for p in profissionais_raw:
        profissionais_final.append({
            "cpf": p["cpf"],
            "nome": p["nome"],
            "area": p["area"],
            "cidade": p["cidade"],
            "contato": p["contato"],
            # Garante que a nota seja um número e arredonda para 1 casa decimal
            "nota_media": round(p["nota_media"], 1) if p["nota_media"] is not None else 0,
            "total_avaliacoes": p["total_avaliacoes"]
        })

    return jsonify(profissionais_final)

@app.route('/profissionais/buscar', methods=['GET'])
def buscar_profissionais():
    termo = request.args.get('termo', '').strip()
    if not termo:
        return jsonify([])

    termo_busca = f"%{termo}%"
    conn = get_db_connection()
    cur = conn.cursor()
    
    # A mesma consulta inteligente, mas com o filtro da busca (nome ou área)
    cur.execute(
        """
        SELECT
            u.cpf, u.nome, u.area, u.cidade, u.contato,
            AVG(a.nota) as nota_media,
            COUNT(a.id_avaliacao) as total_avaliacoes
        FROM usuarios u
        LEFT JOIN avaliacoes a ON u.cpf = a.cpf_avaliado
        WHERE u.tipo = 'prestador' AND (u.nome LIKE ? OR u.area LIKE ?)
        GROUP BY u.cpf
        """,
        (termo_busca, termo_busca)
    )
    
    profissionais_raw = cur.fetchall()
    conn.close()

    # Formata a saída para o JSON final
    profissionais_final = []
    for p in profissionais_raw:
        profissionais_final.append({
            "cpf": p["cpf"],
            "nome": p["nome"],
            "area": p["area"],
            "cidade": p["cidade"],
            "contato": p["contato"],
            "nota_media": round(p["nota_media"], 1) if p["nota_media"] is not None else 0,
            "total_avaliacoes": p["total_avaliacoes"]
        })

    return jsonify(profissionais_final)

@app.route('/solicitacoes/<cpf>', methods=['GET'])
def listar_solicitacoes_unificado(cpf):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # ### CONSULTA SQL ATUALIZADA ###
    # Adicionamos uma subconsulta (EXISTS) para verificar se o usuário logado
    # (cujo CPF está na variável 'cpf') já fez uma avaliação para este serviço.
    cur.execute("""
        SELECT
            s.*,
            cliente.nome as cliente_nome,
            cliente.contato as cliente_contato,
            profissional.nome as profissional_nome,
            (SELECT AVG(nota) FROM avaliacoes WHERE cpf_avaliado = s.cliente_cpf) as cliente_nota_media,
            
            -- ESTA É A NOVA PARTE:
            EXISTS (
                SELECT 1 FROM avaliacoes a 
                WHERE a.id_solicitacao = s.id_solicitacao 
                AND a.cpf_avaliador = ?  -- Passamos o CPF do usuário logado aqui
            ) as avaliado_por_mim

        FROM solicitacoes s
        JOIN usuarios cliente ON s.cliente_cpf = cliente.cpf
        JOIN usuarios profissional ON s.profissional_cpf = profissional.cpf
        WHERE s.cliente_cpf = ? OR s.profissional_cpf = ?
        ORDER BY s.data_solicitacao DESC
    """, (cpf, cpf, cpf)) # Agora passamos o CPF 3 vezes para a consulta
    
    solicitacoes = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(solicitacoes)

@app.route('/avaliacoes', methods=['POST'])
def cadastrar_avaliacao():
    dados = request.json or {}
    id_solicitacao = dados.get("id_solicitacao")
    cpf_avaliador = dados.get("cpf_avaliador")
    cpf_avaliado = dados.get("cpf_avaliado")
    nota = dados.get("nota")
    comentario = dados.get("comentario", "").strip()

    if not (id_solicitacao and cpf_avaliador and cpf_avaliado and nota):
        return jsonify({"erro": "Dados de avaliação incompletos"}), 400
    
    conn = get_db_connection(); cur = conn.cursor()
    # Verifica se este avaliador já avaliou este serviço
    cur.execute("SELECT 1 FROM avaliacoes WHERE id_solicitacao = ? AND cpf_avaliador = ?", (id_solicitacao, cpf_avaliador))
    if cur.fetchone():
        conn.close()
        return jsonify({"erro": "Você já avaliou este serviço!"}), 409

    data_avaliacao = datetime.now().strftime("%Y-%m-%d %H:%M")
    cur.execute(
        "INSERT INTO avaliacoes (id_solicitacao, cpf_avaliador, cpf_avaliado, nota, comentario, data_avaliacao) VALUES (?,?,?,?,?,?)",
        (id_solicitacao, cpf_avaliador, cpf_avaliado, nota, comentario, data_avaliacao)
    )
    conn.commit(); conn.close()
    return jsonify({"mensagem": "Avaliação registrada com sucesso"}), 201

# ### ALTERADO ### Endpoint de usuário para retornar as duas médias de avaliação
@app.route('/usuario/<cpf>', methods=['GET'])
def obter_usuario(cpf):
    conn = get_db_connection(); cur = conn.cursor()
    # Pega os dados básicos do usuário
    cur.execute("SELECT * FROM usuarios WHERE cpf=?", (cpf,))
    usuario = cur.fetchone()
    if not usuario:
        conn.close()
        return jsonify({"erro":"Usuário não encontrado"}),404
    
    usuario_dict = dict(usuario)

    # Calcula a nota média como profissional
    cur.execute("SELECT AVG(nota) as media FROM avaliacoes WHERE cpf_avaliado = ?",(cpf,))
    nota_prof = cur.fetchone()['media']
    usuario_dict['nota_media_profissional'] = round(nota_prof, 1) if nota_prof else 0

    # Calcula a nota média como cliente
    cur.execute("SELECT AVG(nota) as media FROM avaliacoes WHERE cpf_avaliado = ?",(cpf,)) # A lógica aqui seria diferente se o tipo fosse levado em conta. Simplificando por agora.
    nota_cliente = cur.fetchone()['media']
    usuario_dict['nota_media_cliente'] = round(nota_cliente, 1) if nota_cliente else 0
    
    conn.close()
    return jsonify(usuario_dict)


@app.route('/contratar', methods=['POST'])
def contratar_servico():
    d = request.json or {}
    c_cpf = d.get("cliente","").strip()
    p_cpf = d.get("profissional","").strip()
    area = d.get("area","").strip()
    desc = d.get("descricao","").strip()
    data = datetime.now().strftime("%Y-%m-%d %H:%M")

    if not (c_cpf and p_cpf and area and desc):
        return jsonify({"erro":"Faltam dados para contratação"}),400
    
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute(
      "INSERT INTO solicitacoes (cliente_cpf, profissional_cpf, area, descricao_servico, data_solicitacao, status) VALUES (?,?,?,?,?,?)",
      (c_cpf,p_cpf,area,desc,data,"pendente"))
    conn.commit(); conn.close()
    return jsonify({"mensagem":"Solicitação registrada com sucesso"}),201

@app.route('/solicitacoes/<int:id_solicitacao>/atualizar', methods=['POST'])
def atualizar_solicitacao(id_solicitacao):
    dados = request.json or {}
    novo_status = dados.get("novo_status", "").strip()
    if not novo_status: return jsonify({"erro":"Novo status é obrigatório"}), 400
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("UPDATE solicitacoes SET status = ? WHERE id_solicitacao = ?", (novo_status, id_solicitacao))
    if cur.rowcount == 0:
        conn.close()
        return jsonify({"erro":"Solicitação não encontrada"}), 404
    conn.commit(); conn.close()
    return jsonify({"mensagem":f"Status atualizado para '{novo_status}'"}), 200

@app.route('/usuario/<cpf>/atualizar', methods=['PUT'])
def atualizar_usuario(cpf):
    dados  = request.json or {}
    nome   = dados.get("nome","").strip()
    contato= dados.get("contato","").strip()
    cidade = dados.get("cidade","").strip()
    area   = dados.get("area","").strip() if dados.get("area") else None
    if not nome: return jsonify({"erro":"Nome é obrigatório"}),400
    
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("UPDATE usuarios SET nome=?, contato=?, cidade=?, area=? WHERE cpf=?", (nome, contato, cidade, area, cpf))
    if cur.rowcount==0:
        conn.close()
        return jsonify({"erro":"Usuário não encontrado"}),404

    conn.commit(); conn.close()
    return jsonify({"mensagem":"Dados atualizados com sucesso"}),200

@app.route('/usuario/<cpf>', methods=['DELETE'])
def excluir_usuario(cpf):
    dados = request.json or {}
    senha_fornecida = dados.get('senha')

    if not senha_fornecida:
        return jsonify({"erro": "Senha é necessária para exclusão"}), 400

    conn = get_db_connection(); cur = conn.cursor()

    # 1. Busca o usuário e sua senha real no banco
    cur.execute("SELECT senha FROM usuarios WHERE cpf = ?", (cpf,))
    usuario = cur.fetchone()

    if not usuario:
        conn.close()
        return jsonify({"erro": "Usuário não encontrado"}), 404

    # 2. Verifica se a senha fornecida está correta
    # Se você estiver usando hasheamento de senha, use a função check_password_hash aqui!
    if usuario['senha'] != senha_fornecida:
        conn.close()
        return jsonify({"erro": "Senha incorreta"}), 401 # 401 Unauthorized

    # 3. Se a senha estiver correta, ANONIMIZA o usuário em vez de apagar
    novo_email = f"usuario_excluido_{cpf}@pjobs.com"
    cur.execute("""
        UPDATE usuarios
        SET
            nome = 'Usuário Excluído',
            email = ?,
            senha = 'CONTA_EXCLUIDA',
            contato = NULL,
            cidade = NULL
        WHERE cpf = ?
    """, (novo_email, cpf))

    conn.commit()
    conn.close()

    return jsonify({"mensagem": "Sua conta foi excluída com sucesso."}), 200

@app.route('/conversas/<cpf>', methods=['GET'])
def get_conversas(cpf):
    conn = get_db_connection()
    # Busca conversas onde o usuário é participante 1 OU participante 2
    rows = conn.execute("""
        SELECT c.id_conversa, p1.nome as nome1, p2.nome as nome2, p1.cpf as cpf1, p2.cpf as cpf2
        FROM conversas c
        JOIN usuarios p1 ON c.cpf_participante1 = p1.cpf
        JOIN usuarios p2 ON c.cpf_participante2 = p2.cpf
        WHERE c.cpf_participante1 = ? OR c.cpf_participante2 = ?
    """, (cpf, cpf)).fetchall()
    conn.close()

    conversas = []
    for row in rows:
        # Descobre quem é o "outro" participante da conversa
        outro_nome = row['nome2'] if row['cpf1'] == cpf else row['nome1']
        conversas.append({
            "id_conversa": row['id_conversa'],
            "nome_outro_participante": outro_nome
        })
    return jsonify(conversas)

# Endpoint para buscar o histórico de mensagens de uma conversa
@app.route('/conversas/<int:id_conversa>/mensagens', methods=['GET'])
def get_mensagens(id_conversa):
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT m.*, u.nome as nome_remetente
        FROM mensagens m
        JOIN usuarios u ON m.cpf_remetente = u.cpf
        WHERE m.id_conversa = ? ORDER BY m.data_envio ASC
    """, (id_conversa,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/conversas/iniciar', methods=['POST'])
def iniciar_conversa():
    dados = request.json
    cpf1 = dados.get('cpf1')
    cpf2 = dados.get('cpf2')

    if not (cpf1 and cpf2):
        return jsonify({"erro": "CPFs dos participantes são obrigatórios"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Procura por uma conversa existente entre os dois, em qualquer ordem
    cur.execute(
        "SELECT id_conversa FROM conversas WHERE (cpf_participante1 = ? AND cpf_participante2 = ?) OR (cpf_participante1 = ? AND cpf_participante2 = ?)",
        (cpf1, cpf2, cpf2, cpf1)
    )
    conversa_existente = cur.fetchone()

    if conversa_existente:
        # Se a conversa já existe, apenas retorna o ID dela
        id_conversa = conversa_existente['id_conversa']
        conn.close()
        return jsonify({"id_conversa": id_conversa}), 200
    else:
        # Se não existe, cria uma nova conversa
        cur.execute(
            "INSERT INTO conversas (cpf_participante1, cpf_participante2) VALUES (?, ?)",
            (cpf1, cpf2)
        )
        id_nova_conversa = cur.lastrowid
        conn.commit()
        conn.close()
        return jsonify({"id_conversa": id_nova_conversa}), 201 # 201 Created

# ### EVENTOS DE WEBSOCKET PARA O CHAT ###

# Evento chamado quando um cliente se conecta ao chat
@socketio.on('connect')
def handle_connect():
    print('Cliente conectado ao WebSocket!')

# Evento para um usuário "entrar" em uma sala de chat específica
@socketio.on('join_room')
def handle_join_room(data):
    room = data['room'] # O nome da sala será, por exemplo, "conversa_101"
    join_room(room)
    print(f"Usuário entrou na sala: {room}")

# Evento principal: quando um usuário envia uma mensagem
@socketio.on('send_message')
def handle_send_message(data):
    # O "Golpe": Nós NÃO salvamos mais no banco de dados.
    # Nós apenas pegamos a mensagem e a transmitimos de volta.
    
    room = data.get('room')
    cpf_remetente = data.get('cpf_remetente')
    conteudo = data.get('conteudo')
    
    # Precisamos do nome, então fazemos uma busca rápida
    conn = get_db_connection()
    remetente = conn.execute("SELECT nome FROM usuarios WHERE cpf = ?", (cpf_remetente,)).fetchone()
    conn.close()

    # Prepara a mensagem para enviar de volta
    mensagem_para_enviar = {
        'conteudo': conteudo,
        'cpf_remetente': cpf_remetente,
        'nome_remetente': remetente['nome'] if remetente else 'Desconhecido'
    }

    # "Empurra" a nova mensagem para todos na sala
    socketio.emit('new_message', mensagem_para_enviar, to=room)
    print(f"MENSAGEM EM TEMPO REAL ENVIADA (SEM SALVAR): {mensagem_para_enviar}")

@app.route('/avaliacoes/usuario/<cpf>', methods=['GET'])
def listar_avaliacoes_recebidas(cpf):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Busca a nota, o comentário e o NOME de quem escreveu a avaliação
    cur.execute("""
        SELECT 
            a.nota, 
            a.comentario, 
            a.data_avaliacao,
            u.nome as nome_avaliador
        FROM avaliacoes a
        JOIN usuarios u ON a.cpf_avaliador = u.cpf
        WHERE a.cpf_avaliado = ?
        ORDER BY a.data_avaliacao DESC
    """, (cpf,))
    
    avaliacoes = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(avaliacoes), 200

# --- Inicialização ---
if __name__ == '__main__':
    criar_tabelas_se_nao_existirem()
    socketio.run(app, host='0.0.0.0', debug=True)