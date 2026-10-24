# 💼 PJobs — Plataforma de Conexão Profissional e Vagas

O **PJobs** é uma aplicação web Full-stack desenvolvida como **Trabalho de Conclusão de Curso (TCC)** no curso de Ciência da Computação. A plataforma visa conectar trabalhadores autônomos e clientes de forma intuitiva, prática e segura.

---

## 🌟 Principais Funcionalidades

* **Cadastro e Autenticação:** Fluxo de criação de conta e acesso diferenciado para clientes e profissionais.
* **Perfis Personalizados:** Áreas dedicadas para gestão e exibição de dados do perfil do usuário.
* **Painel do Cliente & Profissional:** Interfaces adaptadas às necessidades de quem contrata e de quem trabalha.
* **Chat Integrado:** Comunicação direta entre as partes para negociação e detalhes do serviço.
* **Sistema de Avaliação e Feedback:** Funcionalidade para clientes avaliarem os serviços prestados, permitindo construir a reputação dos usuários na plataforma através de notas e comentários.
* **Busca e Navegação:** Página inicial interativa para exploração de serviços e oportunidades.

---

## 🛠️ Tecnologias Utilizadas

### **Back-end**
* **Python 3** — Linguagem principal de desenvolvimento.
* **Flask** — Micro-framework web para gerenciamento de rotas e regras de negócio.
* **SQLite** - Banco de dados.

### **Front-end**
* **HTML5 & CSS3 (`styles.css`)** — Estruturação semântica e estilização responsiva.
* **JavaScript (`script.js`)** — Dinamismo da interface, requisições e interatividade do chat/painel.

---

## 📂 Estrutura do Projeto

```text
Pjobs/
├── Backend/
│   ├── app.py           # Servidor Flask e rotas da aplicação
│   └── requirements.txt # Dependências do projeto Python
├── Frontend/
│   ├── cadastro.html    # Tela de registro de novos usuários
│   ├── chat.html        # Módulo de mensagens entre usuários
│   ├── cliente.html     # Painel / Dashboard do cliente
│   ├── index.html       # Landing page / Página inicial do sistema
│   ├── perfil.html      # Visualização e edição de perfil
│   ├── profissional.html# Painel / Dashboard do profissional
│   ├── script.js        # Scripts JS para manipulação do Front-end
│   └── styles.css       # Estilização global da aplicação
├── .gitignore           # Arquivos ignorados pelo controle de versão
└── README.md            # Documentação do projeto

```

---

## 🚀 Como Executar o Projeto Localmente

### **Pré-requisitos**

* Python 3.10+ instalado.
* Git instalado.

### **Passo a Passo**

1. **Clonar o repositório:**

```bash
git clone [https://github.com/bizurico/PJOBS.git](https://github.com/bizurico/PJOBS.git)
cd PJOBS

```

2. **Criar e ativar o ambiente virtual (venv):**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

```

3. **Instalar as dependências:**

```bash
pip install -r Backend/requirements.txt

```

4. **Executar a aplicação:**

```bash
python Backend/app.py

```

5. **Acessar no navegador:**
Acesse o endereço: `http://127.0.0.1:5000`

---

## 👤 Autor

* **Luis Henrique** — *Desenvolvimento Full-stack & Arquitetura do Sistema*
* **GitHub:** [@bizurico](https://www.google.com/search?q=https://github.com/bizurico)
