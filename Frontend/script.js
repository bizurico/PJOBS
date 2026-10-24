// =======================================================================
//          SCRIPT.JS - VERSÃO FINAL, UNIFICADA E ORGANIZADA
// =======================================================================

// ========================================================
//          CONFIGURAÇÃO E CONSTANTES GLOBAIS
// ========================================================

const API_BASE_URL = 'http://192.168.0.13:5000'; // <<< VERIFIQUE SE ESTE IP AINDA É O CORRETO
let socket; // Variável global para a conexão do chat
let notaSelecionada = 0; // Variável global para a avaliação
let _solicitacaoTemp = {}; // Variável global para a solicitação
let formSubmitHandler = null; // Variável para gerenciar o listener do chat

const MINHAS_AREAS_PREDEFINIDAS = [
  { id: "Encanador",   nome: "Encanador"   },
  { id: "Eletricista", nome: "Eletricista" },
  { id: "Pintor",      nome: "Pintor"      },
  { id: "Faxineiro",   nome: "Faxineiro"   }
];


// ========================================================
//          LÓGICA DE INICIALIZAÇÃO (O "CÉREBRO")
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Funções que rodam em TODAS as páginas
    atualizarHeader();
    gerenciarBotaoVoltar();

    // 2. "Roteador" que executa o código específico de cada página
    const pagina = window.location.pathname.split('/').pop();

    if (pagina.includes('index.html') || pagina === '' || document.getElementById('formLogin')) {
        ativarPaginaLogin();
    }
    if (pagina.includes('cadastro.html')) {
        ativarPaginaCadastro();
    }
    if (pagina.includes('cliente.html')) {
        ativarPaginaCliente();
    }
    if (pagina.includes('profissional.html')) {
        ativarPaginaProfissional();
    }
    if (pagina.includes('perfil.html')) {
        ativarPaginaPerfil();
    }
    if (pagina.includes('chat.html')) {
        ativarPaginaChat();
    }
});


// ========================================================
//          FUNÇÕES DE ATIVAÇÃO DE PÁGINAS (ROTEADOR)
// ========================================================

function ativarPaginaLogin() {
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', realizarLogin);
    }
}

function ativarPaginaCadastro() {
    const formCadastro = document.getElementById('formCadastro');
    const tipoUsuario = document.getElementById('tipo');
    const areaContainer = document.getElementById('area-container');
    
    if (formCadastro && tipoUsuario && areaContainer) {
        popularAreasNoCadastro();
        areaContainer.style.display = tipoUsuario.value === 'prestador' ? 'block' : 'none';
        tipoUsuario.addEventListener('change', () => {
            areaContainer.style.display = tipoUsuario.value === 'prestador' ? 'block' : 'none';
        });
        formCadastro.addEventListener('submit', cadastrarUsuario);
    }
}

function ativarPaginaCliente() {
    carregarAreasDeAtuacao();
    carregarServicosEmAndamentoCliente();
    
    const btnConfirmar = document.getElementById('btn-confirmar-solicitacao');
    if (btnConfirmar) {
        btnConfirmar.onclick = confirmarSolicitacao;
    }
    
    const formBusca = document.getElementById('form-busca');
    if(formBusca) {
        formBusca.addEventListener('submit', (event) => {
            event.preventDefault();
            const termo = document.getElementById('input-busca').value.trim();
            if (termo) executarBusca(termo);
        });
    }

    const btnVoltarCategorias = document.getElementById('btn-voltar-categorias');
    if(btnVoltarCategorias) {
        btnVoltarCategorias.onclick = () => {
            document.getElementById('secao-resultados-busca').style.display = 'none';
            document.getElementById('secao-areas-atuacao').style.display = 'block';
            document.getElementById('input-busca').value = '';
        };
    }
    
    const btnVoltarParaAreas = document.getElementById('btn-voltar-para-areas');
    if(btnVoltarParaAreas) {
        btnVoltarParaAreas.onclick = () => {
            document.getElementById('secao-profissionais').style.display = 'none';
            document.getElementById('secao-areas-atuacao').style.display = 'block';
        };
    }
    
    const textareaSolicitacao = document.getElementById('descricao-solicitacao');
    if (textareaSolicitacao) {
        textareaSolicitacao.addEventListener('focus', () => {
            setTimeout(() => {
                document.querySelector('#modal-solicitacao .modal-content').scrollIntoView({ 
                    behavior: 'smooth', block: 'center' 
                });
            }, 300);
        });
    }
}

function ativarPaginaProfissional() {
    carregarPainelProfissional();
}

function ativarPaginaPerfil() {
    popularFormularioPerfil(); 
    carregarHistorico();
    
    document.getElementById('formPerfil').addEventListener('submit', salvarAlteracoes);
    document.getElementById('formMudarSenha').addEventListener('submit', alterarSenha);

    const abaAtiva = localStorage.getItem('abaAtivaPerfil');
    if (abaAtiva === 'historico') {
        const botaoAbaHistorico = document.querySelector('.tab-link[onclick*="historico"]');
        if (botaoAbaHistorico) botaoAbaHistorico.click();
        localStorage.removeItem('abaAtivaPerfil');
    }
    
    const btnExcluir = document.getElementById('btn-excluir-conta');
    if (btnExcluir) {
        btnExcluir.onclick = abrirModalExclusao; 
    }
    const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao');
    if (btnConfirmarExclusao) {
        btnConfirmarExclusao.onclick = confirmarExclusao;
    }
    
    // Ativa as estrelas do modal de avaliação
    const estrelasContainer = document.querySelector('.estrelas-avaliacao');
    if (estrelasContainer) {
        const todasAsEstrelas = estrelasContainer.querySelectorAll('i');
        estrelasContainer.addEventListener('click', (event) => {
            const spanClicado = event.target.closest('span');
            if (!spanClicado) return;
            notaSelecionada = parseInt(spanClicado.dataset.nota);
            todasAsEstrelas.forEach((estrelaIcon, index) => {
                estrelaIcon.className = (index < notaSelecionada) ? 'fa-solid fa-star' : 'fa-regular fa-star';
            });
        });
    }
}


// ========================================================
//          FUNÇÕES GLOBAIS DE UI (HEADER, MODAIS, ABAS)
// ========================================================

function atualizarHeader() {
    const nomeUsuario = localStorage.getItem('nome');
    const sidebarDiv = document.querySelector('.sidebar');
    const menuDeslogado = document.getElementById('menu-deslogado');

    if (!sidebarDiv) return;

    if (nomeUsuario) {
        // --- USUÁRIO LOGADO ---
        if (menuDeslogado) menuDeslogado.style.display = 'none';
        
        const menuLogado = document.getElementById('menu-usuario-logado');
        if (menuLogado) {
            menuLogado.style.display = 'block';
            
            const nomePlaceholder = document.getElementById('sidebar-nome');
            const userBtn = document.getElementById('user-sidebar-btn');
            const menu = document.getElementById('sidebar-menu');

            if (nomePlaceholder) nomePlaceholder.textContent = nomeUsuario;
            if (userBtn && menu) {
                // Define o conteúdo do menu dropdown
                menu.innerHTML = `
                    <a href="perfil.html">Meus Dados</a>
                    <a href="#" onclick="abrirAbaHistorico(event)">Histórico</a>
                    <a href="chat.html">Mensagens</a>
                    <a href="#" id="sidebar-logout">Sair</a>
                `;

                // Ativa o clique no botão principal
                userBtn.onclick = () => {
                    menu.classList.toggle('is-open');
                };

                // Ativa o clique no botão de sair (que está dentro do menu)
                const logoutBtn = document.getElementById('sidebar-logout');
                if (logoutBtn) {
                    logoutBtn.onclick = (e) => {
                        e.preventDefault();
                        localStorage.clear();
                        window.location.href = 'index.html';
                    };
                }
            }
        }
    } else {
        // --- USUÁRIO DESLOGADO ---
        if (menuDeslogado) menuDeslogado.style.display = 'block';
        const menuLogado = document.getElementById('menu-usuario-logado');
        if (menuLogado) menuLogado.style.display = 'none';
    }
}

function gerenciarBotaoVoltar() {
    const btnVoltar = document.getElementById('btn-voltar-header');
    if (!btnVoltar) return;

    const paginaAtual = window.location.pathname.split('/').pop();
    if (paginaAtual.includes('chat.html')) {
        btnVoltar.style.display = 'none';
        return;
    }
    
    const paginasComBotaoVoltar = ['perfil.html']; 
    if (paginasComBotaoVoltar.includes(paginaAtual)) {
        btnVoltar.style.display = 'block';
        btnVoltar.onclick = () => redirecionarPorTipo();
    } else {
        btnVoltar.style.display = 'none';
    }
}

window.addEventListener('click', function(event) {
    const menu = document.getElementById('sidebar-menu');
    const botaoMenu = document.getElementById('user-sidebar-btn');
    if (!menu || !botaoMenu) return;

    // Fecha o menu se o clique for fora do botão
    if (menu.classList.contains('is-open') && !botaoMenu.contains(event.target)) {
        menu.classList.remove('is-open');
    }
});

function abrirAbaHistorico(event) {
    event.preventDefault();
    localStorage.setItem('abaAtivaPerfil', 'historico');
    window.location.href = 'perfil.html';
}

function mostrarAba(event, nomeDaAba) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].style.display = 'none';
    }
    const tabLinks = document.getElementsByClassName('tab-link');
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].className = tabLinks[i].className.replace(' active', '');
    }
    
    const aba = document.getElementById(nomeDaAba);
    if(aba) {
        aba.style.display = 'block';
        event.currentTarget.className += ' active';
    }
}

// ========================================================
//          FUNÇÕES DE LÓGICA DE NEGÓCIO
// ========================================================

// ----------- AUTENTICAÇÃO E CADASTRO -----------

function realizarLogin(event) {
    event.preventDefault();
    const email = document.getElementById('emailLogin').value;
    const senha = document.getElementById('senhaLogin').value;
    loginUsuario(email, senha);
}

function loginUsuario(email, senha) {
    fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
    })
    .then(response => {
        if (!response.ok) return response.json().then(errData => Promise.reject(errData));
        return response.json();
    })
    .then(data => {
        localStorage.setItem('nome', data.nome);
        localStorage.setItem('email', email);
        localStorage.setItem('cpf', data.cpf);
        localStorage.setItem('tipo', data.tipo);
        redirecionarPorTipo();
    })
    .catch(error => {
        alert(error.erro || 'Email ou senha inválidos.');
        console.error('Falha no login:', error);
    });
}

function cadastrarUsuario(event) {
    event.preventDefault();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar-senha').value;
    if (senha !== confirmarSenha) {
        alert("As senhas não são iguais. Por favor, tente novamente.");
        return;
    }
    const dados = {
        nome:    document.getElementById('nome').value,
        email:   document.getElementById('email').value,
        cpf:     document.getElementById('cpf').value,
        senha:   senha,
        cidade:  document.getElementById('cidade').value,
        contato: document.getElementById('contato').value,
        tipo:    document.getElementById('tipo').value
    };
    if (dados.tipo === 'prestador') {
        dados.area = document.getElementById('area').value;
    }
    fetch(`${API_BASE_URL}/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    })
.then(r => r.json())
    .then(j => {
        // 'j' é a resposta do backend, que deve conter:
        // { mensagem: "...", nome: "...", cpf: "...", tipo: "..." }

        if (j.mensagem && j.nome && j.cpf && j.tipo) {
            // SUCESSO! O cadastro funcionou.
            // Em vez de chamar loginUsuario(), nós já temos os dados.
            // Vamos logar o usuário manualmente no localStorage.
            
            localStorage.setItem('nome', j.nome);
            localStorage.setItem('email', dados.email); // 'dados' é a variável que tem o email que o usuário digitou
            localStorage.setItem('cpf', j.cpf);
            localStorage.setItem('tipo', j.tipo);
            
            // E agora redirecionamos
         // Mostra "Usuário cadastrado com sucesso"
            redirecionarPorTipo();

        } else {
            // Se o cadastro falhou (ex: usuário já existe), 'j.erro' terá a mensagem
            alert(j.erro || "Ocorreu um erro desconhecido no cadastro.");
        }
    })
    .catch(console.error);
}

function redirecionarPorTipo() {
    const tipo = localStorage.getItem('tipo');
    if (tipo === 'cliente') {
        window.location.href = 'cliente.html';
    } else if (tipo === 'prestador') {
        window.location.href = 'profissional.html';
    } else {
        window.location.href = 'index.html'; // Fallback
    }
}

function popularAreasNoCadastro() {
    const sel = document.getElementById('area');
    if (sel) {
        sel.innerHTML = '<option value="">Selecione uma área</option>';
        MINHAS_AREAS_PREDEFINIDAS.forEach(area => {
            sel.innerHTML += `<option value="${area.id}">${area.nome}</option>`;
        });
    }
}

// ----------- LÓGICA DA PÁGINA DO CLIENTE -----------

function carregarAreasDeAtuacao() {
    const listaAreasContainer = document.getElementById('lista-areas-atuacao');
    if (!listaAreasContainer) return; 
    listaAreasContainer.innerHTML = '';
    const iconesDasAreas = {
        'Encanador': 'fa-solid fa-faucet-drip',
        'Eletricista': 'fa-solid fa-bolt',
        'Pintor': 'fa-solid fa-paint-roller',
        'Faxineiro': 'fa-solid fa-broom',
        'Default': 'fa-solid fa-user-tie'
    };
    MINHAS_AREAS_PREDEFINIDAS.forEach(areaInfo => {
        const areaCard = document.createElement('div');
        areaCard.className = 'area-card';
        const icone = iconesDasAreas[areaInfo.id] || iconesDasAreas['Default'];
        areaCard.innerHTML = `<i class="${icone} area-icon"></i><h3>${areaInfo.nome}</h3>`;
        areaCard.onclick = () => {
            document.getElementById('secao-areas-atuacao').style.display = 'none';
            document.getElementById('secao-resultados-busca').style.display = 'none';
            document.getElementById('secao-profissionais').style.display = 'block';
            document.getElementById('titulo-profissionais').textContent = `Profissionais de ${areaInfo.nome}`;
            carregarProfissionaisPorArea(areaInfo.id);
        };
        listaAreasContainer.appendChild(areaCard);
    });
}

function carregarProfissionaisPorArea(areaId) {
    const container = document.getElementById('lista-profissionais');
    if (!container) return;
    container.innerHTML = '<div class="feedback-message">Buscando profissionais...</div>';
    fetch(`${API_BASE_URL}/profissionais`)
        .then(r => r.json())
        .then(todosProfissionais => {
            const profissionaisDaArea = todosProfissionais.filter(p => 
                p.area && p.area.toLowerCase() === areaId.toLowerCase()
            );
            const msgVazio = `Nenhum profissional encontrado para a área de ${areaId}.`;
            exibirProfissionais(profissionaisDaArea, container, msgVazio);
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = '<div class="feedback-message erro">Erro ao carregar os profissionais.</div>';
        });
}

function executarBusca(termo) {
    const secaoAreas = document.getElementById('secao-areas-atuacao');
    const secaoProfissionais = document.getElementById('secao-profissionais');
    const secaoResultados = document.getElementById('secao-resultados-busca');
    const containerResultados = document.getElementById('container-resultados');
    
    secaoAreas.style.display = 'none';
    secaoProfissionais.style.display = 'none';
    secaoResultados.style.display = 'block';
    document.getElementById('titulo-resultados').textContent = `Resultados para "${termo}"`;
    containerResultados.innerHTML = '<div class="feedback-message">Buscando...</div>';

    fetch(`${API_BASE_URL}/profissionais/buscar?termo=${termo}`)
        .then(response => response.json())
        .then(profissionaisEncontrados => {
            const msgVazio = 'Nenhum profissional encontrado com este termo de busca.';
            exibirProfissionais(profissionaisEncontrados, containerResultados, msgVazio);
        })
        .catch(console.error);
}

function exibirProfissionais(lista, container, mensagemVazio) {
    if (!container) return;
    container.innerHTML = '';
    if (lista.length === 0) {
        container.innerHTML = `<div class="feedback-message">${mensagemVazio}</div>`;
        return;
    }
    lista.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        let avaliacaoHTML = '<div class="card-avaliacao sem-avaliacao">Nenhuma avaliação</div>';
        if (p.total_avaliacoes > 0 && p.nota_media) {
            const estrelas = gerarEstrelasHTML(p.nota_media); 
            avaliacaoHTML = `
                <div class="card-avaliacao">
                    <div class="estrelas">${estrelas}</div>
                    <span><strong>${Number(p.nota_media).toFixed(1)}</strong> (${p.total_avaliacoes} avaliações)</span>
                </div>
            `;
        }
        card.innerHTML = `
            <h3>${p.nome}</h3>
            ${avaliacaoHTML}
            <p><strong>Área:</strong> ${p.area}</p>
            <p><strong>Cidade:</strong> ${p.cidade || 'Não informada'}</p>
            <p><strong>Contato:</strong> ${p.contato || 'Não informado'}</p>
            <div class="card-actions">
                <button class="btn-secundario" onclick="verAvaliacoes('${p.cpf}')" style="background-color: #17a2b8; margin-bottom: 5px;">Ver Avaliações</button>
                <button class="btn-mensagem" onclick="iniciarConversa('${p.cpf}', '${p.nome}')">Mensagem</button>
                <button onclick="solicitar('${p.cpf}', '${p.area}')">Contratar</button>
                
            </div>
        `;
        container.appendChild(card);
    });
}

function gerarEstrelasHTML(nota) {
    let htmlEstrelas = '';
    const notaArredondada = Math.round(nota);
    for (let i = 1; i <= 5; i++) {
        htmlEstrelas += (i <= notaArredondada) ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    }
    return htmlEstrelas;
}

function solicitar(cpfProf, area) {
    const clienteCpf = localStorage.getItem('cpf');
    if (!clienteCpf) return;
    _solicitacaoTemp = { cliente: clienteCpf, profissional: cpfProf, area };
    document.getElementById('modal-solicitacao').style.display = 'flex';
}

function fecharModalSolicitacao() {
    document.getElementById('modal-solicitacao').style.display = 'none';
    document.getElementById('descricao-solicitacao').value = '';
    _solicitacaoTemp = {};
}

function confirmarSolicitacao() {
    const descricao = document.getElementById('descricao-solicitacao').value.trim();
    if (!descricao) return;
    const dadosCompletos = { ..._solicitacaoTemp, descricao: descricao };
    fetch(`${API_BASE_URL}/contratar`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(dadosCompletos)
    })
    .then(r => r.json())
    .then(j => {
        alert(j.mensagem || j.erro);
        fecharModalSolicitacao();
        carregarServicosEmAndamentoCliente();
    })
    .catch(console.error);
}

function carregarServicosEmAndamentoCliente() {
    const cpf = localStorage.getItem('cpf');
    const container = document.getElementById('container-servicos-andamento');
    if (!cpf || !container) return;
    container.innerHTML = "<p>Carregando...</p>";
    fetch(`${API_BASE_URL}/solicitacoes/${cpf}`)
        .then(res => res.json())
        .then(lista => {
            const servicosAtivos = lista.filter(s => s.status === 'pendente' || s.status === 'aceito');
            container.innerHTML = '';
            if (servicosAtivos.length === 0) {
                container.innerHTML = '<div class="feedback-message">Você não tem serviços em andamento.</div>';
                return;
            }
            servicosAtivos.forEach(servico => {
                const card = document.createElement('div');
                card.className = 'card solicitacao-card';
                card.innerHTML = `
                    <h3>Serviço de ${servico.area}</h3>
                    <p><strong>Profissional:</strong> ${servico.profissional_nome}</p>
                    <p><strong>Descrição:</strong> ${servico.descricao_servico}</p>
                    <p><strong>Status:</strong> <span class="status-${servico.status}">${servico.status}</span></p>
                `;
                container.appendChild(card);
            });
        });
}

// ----------- LÓGICA DA PÁGINA DO PROFISSIONAL -----------

function carregarPainelProfissional() {
    const cpf = localStorage.getItem('cpf');
    if (!cpf) return;
    const novasContainer = document.getElementById('novas-solicitacoes-container');
    const agendadosContainer = document.getElementById('servicos-agendados-container');
    if (!novasContainer || !agendadosContainer) {
        console.error("ERRO: Containers de solicitações não encontrados no HTML da página do profissional.");
        return;
    }
    novasContainer.innerHTML = '<p>Carregando novas solicitações...</p>';
    agendadosContainer.innerHTML = '<p>Carregando serviços agendados...</p>';
    fetch(`${API_BASE_URL}/solicitacoes/${cpf}`)
        .then(res => res.json())
        .then(lista => {
            novasContainer.innerHTML = '';
            agendadosContainer.innerHTML = '';
            let temNovas = false, temAgendados = false;
            lista.forEach(item => {
                if (item.status === 'pendente' || item.status === 'aceito') {
                    const card = document.createElement('div');
                    card.className = 'card solicitacao-card';
                    let botoesAcao = '';
                    let cardHTML = `
                        <h4>Serviço Solicitado</h4>
                        <p><strong>Cliente:</strong> ${item.cliente_nome || 'Não informado'}</p>
                        <p><strong>Contato:</strong> ${item.cliente_contato || 'Não informado'}</p>
                        <div class="card-avaliacao-cliente">
                            <strong>Reputação do Cliente:</strong> 
                            <span>⭐ ${item.cliente_nota_media ? Number(item.cliente_nota_media).toFixed(1) : 'N/A'}</span>
                            <button onclick="verAvaliacoes('${item.cliente_cpf}')" style="font-size: 0.8rem; padding: 5px 10px; margin-top: 5px; background: #17a2b8; border:none; color:white; border-radius:15px; cursor:pointer;">Ver Comentários</button>
                        </div>
                        </div>
                        <p><strong>Descrição:</strong> ${item.descricao_servico}</p>
                        <p><strong>Data:</strong> ${new Date(item.data_solicitacao).toLocaleString('pt-BR')}</p>
                        <p><strong>Status:</strong> ${item.status}</p>
                    `;
                    if (item.status === 'pendente') {
                        botoesAcao = `
                            <button onclick="atualizarStatus(${item.id_solicitacao}, 'aceito')">Aceitar</button>
                            <button onclick="atualizarStatus(${item.id_solicitacao}, 'recusado')">Recusar</button>
                        `;
                        card.innerHTML = cardHTML + `<div class="card-actions">${botoesAcao}</div>`;
                        novasContainer.appendChild(card);
                        temNovas = true;
                    } else if (item.status === 'aceito') {
                        botoesAcao = `
                            <button onclick="atualizarStatus(${item.id_solicitacao}, 'finalizado')">Finalizar Serviço</button>
                            <button onclick="atualizarStatus(${item.id_solicitacao}, 'cancelado')">Cancelar</button>
                        `;
                        card.innerHTML = cardHTML + `<div class="card-actions">${botoesAcao}</div>`;
                        agendadosContainer.appendChild(card);
                        temAgendados = true;
                    }
                }
            });
            if (!temNovas) novasContainer.innerHTML = '<div class="feedback-message">Nenhuma nova solicitação.</div>';
            if (!temAgendados) agendadosContainer.innerHTML = '<div class="feedback-message">Nenhum serviço agendado.</div>';
        })
        .catch(console.error);
}

function atualizarStatus(id, novoStatus) {
    fetch(`${API_BASE_URL}/solicitacoes/${id}/atualizar`,{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ novo_status: novoStatus })
    })
    .then(response => response.json())
    .then(data => {
        carregarPainelProfissional();
    })
    .catch(console.error);
}

// ----------- LÓGICA DA PÁGINA DE PERFIL -----------

function popularFormularioPerfil() {
    const cpf = localStorage.getItem('cpf');
    if (!cpf) return;
    fetch(`${API_BASE_URL}/usuario/${cpf}`)
        .then(r => r.json())
        .then(usuario => {
            document.getElementById('nome').value = usuario.nome;
            document.getElementById('email').value = usuario.email;
            document.getElementById('cpf').value = usuario.cpf;
            document.getElementById('contato').value = usuario.contato || '';
            document.getElementById('cidade').value = usuario.cidade || '';
            if (usuario.tipo === 'prestador') {
                const divArea = document.getElementById('perfil-area-profissional');
                const selArea = document.getElementById('area');
                if(divArea && selArea) {
                    divArea.style.display = 'block';
                    selArea.innerHTML = '';
                    MINHAS_AREAS_PREDEFINIDAS.forEach(a => {
                        const opt = document.createElement('option');
                        opt.value = a.id;
                        opt.textContent = a.nome;
                        if (a.id === usuario.area) opt.selected = true;
                        selArea.appendChild(opt);
                    });
                }
            }
        });
}

function salvarAlteracoes(event) {
    event.preventDefault();
    const cpf = localStorage.getItem('cpf');
    const payload = {
        nome:    document.getElementById('nome').value,
        contato: document.getElementById('contato').value,
        cidade:  document.getElementById('cidade').value
    };
    if (localStorage.getItem('tipo') === 'prestador') {
        payload.area = document.getElementById('area').value;
    }
    fetch(`${API_BASE_URL}/usuario/${cpf}/atualizar`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(j => {
        if (j.mensagem) {
            localStorage.setItem('nome', payload.nome);
            window.location.reload();
        }
    });
}

function alterarSenha(event) {
    event.preventDefault();
    const cpf = localStorage.getItem('cpf');
    const atual = document.getElementById('senha-atual').value;
    const nova = document.getElementById('nova-senha').value;
    const conf = document.getElementById('confirmar-nova-senha').value;
    if (nova !== conf) return alert("A nova senha e a confirmação não são iguais!");
    
    fetch(`${API_BASE_URL}/usuario/${cpf}/mudar-senha`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ senha_atual: atual, nova_senha: nova })
    })
    .then(r => r.json())
    .then(j => {
        alert(j.mensagem || j.erro);
        if (j.mensagem) document.getElementById('formMudarSenha').reset();
    });
}

function carregarHistorico() {
    const cpf = localStorage.getItem('cpf');
    const tipo = localStorage.getItem('tipo');
    if (!cpf) return; 
    const container = document.getElementById('historico-container');
    if (!container) return; 
    container.innerHTML = '<p>Carregando seu histórico...</p>';

    fetch(`${API_BASE_URL}/solicitacoes/${cpf}`)
        .then(response => response.json())
        .then(historico => {
            container.innerHTML = '';
            if (historico.length === 0) {
                container.innerHTML = '<div class="feedback-message">Nenhum serviço em seu histórico.</div>';
                return;
            }
            historico.forEach(servico => {
                const card = document.createElement('div');
                card.className = 'card';
                let detalhePrincipal = '';
                if (tipo === 'cliente') {
                    detalhePrincipal = `<p><strong>Profissional:</strong> ${servico.profissional_nome || 'Não informado'}</p>`;
                } else {
                    detalhePrincipal = `<p><strong>Cliente:</strong> ${servico.cliente_nome || 'Não informado'}</p>`;
                }
                
                card.innerHTML = `
                    <h3>Serviço de ${servico.area}</h3>
                    ${detalhePrincipal}
                    <p><strong>Descrição:</strong> ${servico.descricao_servico}</p>
                    <p><strong>Status:</strong> <span class="status-${servico.status}">${servico.status}</span></p>
                `;

                // ================== LÓGICA DE AVALIAÇÃO CORRIGIDA ==================
                if (servico.status === 'finalizado') {
                    
                    // Verifica se o backend disse que este serviço AINDA NÃO FOI AVALIADO
                    if (servico.avaliado_por_mim == 0) { 
                        const btnAvaliar = document.createElement('button');
                        if (tipo === 'cliente') {
                            btnAvaliar.textContent = 'Avaliar Profissional';
                            btnAvaliar.onclick = () => abrirModalAvaliacao(servico.id_solicitacao, servico.cliente_cpf, servico.profissional_cpf, servico.profissional_nome);
                        } else { // se for 'prestador'
                            btnAvaliar.textContent = 'Avaliar Cliente';
                            btnAvaliar.onclick = () => abrirModalAvaliacao(servico.id_solicitacao, servico.profissional_cpf, servico.cliente_cpf, servico.cliente_nome);
                        }
                        card.appendChild(btnAvaliar);
                    } else {
                        // Se o serviço JÁ FOI AVALIADO, mostra a mensagem
                        const feedbackAvaliado = document.createElement('p');
                        feedbackAvaliado.className = 'feedback-avaliado';
                        feedbackAvaliado.textContent = '✔️ Você já avaliou este serviço.';
                        card.appendChild(feedbackAvaliado);
                    }
                }
                // =================================================================

                container.appendChild(card);
            });
        })
        .catch(console.error);
}

function abrirModalAvaliacao(id_solicitacao, cpf_avaliador, cpf_avaliado, nome_avaliado) {
    document.getElementById('modal-avaliacao').style.display = 'flex';
    document.getElementById('modal-avaliacao-titulo').textContent = `Avalie ${nome_avaliado}`;
    document.getElementById('avaliacao-id-solicitacao').value = id_solicitacao;
    document.getElementById('avaliacao-cpf-avaliador').value = cpf_avaliador;
    document.getElementById('avaliacao-cpf-avaliado').value = cpf_avaliado;
}

function fecharModalAvaliacao() {
    document.getElementById('modal-avaliacao').style.display = 'none';
    notaSelecionada = 0;
    document.getElementById('comentario-avaliacao').value = '';
    document.querySelectorAll('.estrelas-avaliacao span i').forEach(estrela => {
        estrela.className = 'fa-regular fa-star';
    });
}

function enviarAvaliacao() {
    const id_solicitacao = document.getElementById('avaliacao-id-solicitacao').value;
    const cpf_avaliador = document.getElementById('avaliacao-cpf-avaliador').value;
    const cpf_avaliado = document.getElementById('avaliacao-cpf-avaliado').value;
    const comentario = document.getElementById('comentario-avaliacao').value;
    if (notaSelecionada === 0) {
        alert("Por favor, selecione de 1 a 5 estrelas.");
        return;
    }
    const dadosAvaliacao = {
        id_solicitacao: parseInt(id_solicitacao),
        cpf_avaliador: cpf_avaliador,
        cpf_avaliado: cpf_avaliado,
        nota: notaSelecionada,
        comentario: comentario
    };
    fetch(`${API_BASE_URL}/avaliacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosAvaliacao)
    })
    .then(r => r.json())
    .then(j => {
        if (j.mensagem) {
            fecharModalAvaliacao();
            redirecionarPorTipo();
        }
    })
    .catch(console.error);
}

function abrirModalExclusao() {
    const modal = document.getElementById('modal-confirmar-exclusao');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function fecharModalExclusao() {
    const modal = document.getElementById('modal-confirmar-exclusao');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('senha-confirmacao-exclusao').value = '';
        document.getElementById('erro-exclusao-container').textContent = '';
    }
}

async function confirmarExclusao() {
    const cpf = localStorage.getItem('cpf');
    const senha = document.getElementById('senha-confirmacao-exclusao').value;
    const erroContainer = document.getElementById('erro-exclusao-container');
    if (!senha) {
        erroContainer.textContent = 'O campo de senha não pode estar vazio.';
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/usuario/${cpf}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: senha })
        });
        const resultado = await response.json();
        if (!response.ok) {
            erroContainer.textContent = resultado.erro || 'Ocorreu um erro.';
        } else {
            alert(resultado.mensagem);
            localStorage.clear();
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Erro ao excluir conta:", error);
        erroContainer.textContent = "Erro de comunicação com o servidor.";
    }
}

// ========================================================
//          LÓGICA DA PÁGINA DE CHAT (VERSÃO FINAL)
// ========================================================

function ativarPaginaChat() {
    carregarConversas(); // Continua funcionando
    // Ativa os botões de "Voltar" (continua funcionando)
    const btnVoltarLista = document.getElementById('btn-voltar-lista');
    if (btnVoltarLista) btnVoltarLista.onclick = voltarParaListaDeConversas;
    const btnVoltarPrincipal = document.getElementById('btn-voltar-principal');
    if (btnVoltarPrincipal) btnVoltarPrincipal.onclick = () => redirecionarPorTipo();

    const urlParams = new URLSearchParams(window.location.search);
    const conversaId = urlParams.get('id');
    const nomeOutro = urlParams.get('nome');
    if (conversaId && nomeOutro) {
        abrirConversa(conversaId, decodeURIComponent(nomeOutro));
    }
}

function carregarConversas() {
    const cpf = localStorage.getItem('cpf');
    if (!cpf) return;
    const container = document.getElementById('lista-conversas');
    if (!container) return;
    container.innerHTML = '<p>Carregando...</p>';

    fetch(`${API_BASE_URL}/conversas/${cpf}`)
        .then(res => res.json())
        .then(conversas => {
            container.innerHTML = '';
            if (conversas.length === 0) {
                container.innerHTML = '<p style="padding: 1rem;">Nenhuma conversa encontrada.</p>';
                return;
            }
            conversas.forEach(conv => {
                const item = document.createElement('div');
                item.className = 'conversa-item';
                item.innerHTML = `
                    <div class="chat-avatar"><i class="fa-solid fa-user"></i></div>
                    <span>${conv.nome_outro_participante}</span>
                `;
                item.onclick = () => abrirConversa(conv.id_conversa, conv.nome_outro_participante);
                container.appendChild(item);
            });
        });
}

function abrirConversa(idConversa, nomeOutro) {
    // 1. Prepara a interface visual
    document.querySelector('.chat-container').classList.add('chat-aberto');
    document.getElementById('nome-chat-ativo').textContent = nomeOutro;
    document.getElementById('form-mensagem').style.display = 'flex';
    const mensagensContainer = document.getElementById('mensagens-container');
    mensagensContainer.innerHTML = ''; // Não carregamos o histórico (como pedido)
    
    // 2. Conecta ao WebSocket
    if (socket) socket.disconnect();
    socket = io(API_BASE_URL);
    const sala = `conversa_${idConversa}`;
    socket.on('connect', () => socket.emit('join_room', { room: sala }));

    // 3. Ouve por novas mensagens (a parte do "receber")
    socket.on('new_message', (msg) => {
        adicionarMensagemNaTela(msg, localStorage.getItem('cpf'));
    });

    // 4. ATIVA O ENVIO (A NOVA LÓGICA)
    const btnEnviar = document.getElementById('btn-enviar-mensagem');
    const input = document.getElementById('input-mensagem');

    // Função auxiliar para enviar a mensagem
    const enviarMensagem = () => {
        const conteudo = input.value.trim();
        if (conteudo && socket && socket.connected) {
            socket.emit('send_message', {
                room: sala,
                id_conversa: idConversa, // O backend não vai usar, mas enviamos
                cpf_remetente: localStorage.getItem('cpf'),
                conteudo: conteudo
            });
            input.value = '';
        }
    };

    // "Liga" o nosso botão "burro"
    btnEnviar.onclick = enviarMensagem;

    // "Liga" a tecla Enter
    input.onkeypress = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Impede o "Enter" de pular linha
            enviarMensagem();
        }
    };
}

function adicionarMensagemNaTela(msg, cpfUsuarioLogado) {
    const container = document.getElementById('mensagens-container');
    const balao = document.createElement('div');
    balao.className = 'mensagem-balao';
    
    if (msg.cpf_remetente === cpfUsuarioLogado) {
        balao.classList.add('mensagem-minha');
    } else {
        balao.classList.add('mensagem-outra');
        balao.innerHTML = `<div class="remetente-nome">${msg.nome_remetente}</div>`;
    }
    balao.appendChild(document.createTextNode(msg.conteudo));
    container.appendChild(balao);
    container.scrollTop = container.scrollHeight;
}

function voltarParaListaDeConversas() {
    document.querySelector('.chat-container').classList.remove('chat-aberto');
    if (socket) socket.disconnect();
}

async function iniciarConversa(cpfProfissional, nomeProfissional) {
    const cpfCliente = localStorage.getItem('cpf');
    if (!cpfCliente) return;

    try {
        const response = await fetch(`${API_BASE_URL}/conversas/iniciar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf1: cpfCliente, cpf2: cpfProfissional })
        });
        const data = await response.json();
        if (data.id_conversa) {
            window.location.href = `chat.html?id=${data.id_conversa}&nome=${encodeURIComponent(nomeProfissional)}`;
        } else {
            throw new Error(data.erro || 'Não foi possível iniciar a conversa.');
        }
    } catch (error) {
        console.error("Erro ao iniciar conversa:", error);
    }
}

function verAvaliacoes(cpfAlvo) {
    const modal = document.getElementById('modal-ver-avaliacoes');
    const container = document.getElementById('lista-comentarios-container');
    
    if (!modal || !container) return;

    modal.style.display = 'flex';
    container.innerHTML = '<p style="text-align:center">Carregando avaliações...</p>';

    fetch(`${API_BASE_URL}/avaliacoes/usuario/${cpfAlvo}`)
        .then(res => res.json())
        .then(avaliacoes => {
            container.innerHTML = '';

            if (avaliacoes.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#777;">Este usuário ainda não possui avaliações com comentários.</p>';
                return;
            }

            avaliacoes.forEach(av => {
                const item = document.createElement('div');
                item.className = 'item-comentario';
                
                // Reutiliza sua função de estrelas para ficar visualmente igual
                const estrelasHTML = gerarEstrelasHTML(av.nota);

                item.innerHTML = `
                    <strong>${av.nome_avaliador}</strong>
                    <span class="nota-estrelas">${estrelasHTML}</span>
                    <p>"${av.comentario || 'Sem comentário escrito.'}"</p>
                `;
                container.appendChild(item);
            });
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = '<p style="color:red; text-align:center">Erro ao carregar.</p>';
        });
}

function fecharModalVerAvaliacoes() {
    const modal = document.getElementById('modal-ver-avaliacoes');
    if (modal) modal.style.display = 'none';
}