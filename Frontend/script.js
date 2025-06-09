// ==================== DEFINA SUAS ÁREAS PRÉ-DEFINIDAS AQUI ====================
// Usado pela página cliente.html para exibir as categorias.
// Adapte os 'id' e 'nome' conforme suas necessidades.
// O 'id' deve corresponder ao valor do campo 'area' nos dados dos seus profissionais.
const MINHAS_AREAS_PREDEFINIDAS = [
  { id: "Encanador", nome: "Encanamento" }, // Ex: se p.area é "Encanador", o id é "Encanador"
  { id: "Eletricista", nome: "Elétrica" },
  { id: "Pintor", nome: "Pintura" },
  { id: "Faxina", nome: "Faxina Doméstica" },
  // Adicione suas outras áreas aqui. Ex:
  // { id: "Jardinagem", nome: "Jardinagem" },
  // { id: "Montador", nome: "Montador de Móveis" }
];


// ==================== Cadastro de usuário ====================
function cadastrarUsuario(event) {
  event.preventDefault();

  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const cpf = document.getElementById('cpf').value;
  const senha = document.getElementById('senha').value;
  const tipo = document.getElementById('tipo').value;
  const area = document.getElementById('area') ? document.getElementById('area').value : null; // Pega a área se existir

  const dados = { nome, email, cpf, senha, tipo };
  if (tipo === 'prestador' && area) {
    dados.area = area; // Adiciona a área aos dados se for prestador
  }

  fetch('http://127.0.0.1:5000/cadastro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(res => res.json())
    .then(data => {
      alert(data.mensagem || data.erro);
      if (data.mensagem) {
        localStorage.setItem('email', email);
        localStorage.setItem('tipo', tipo);
        if (tipo === 'cliente') {
          window.location.href = 'cliente.html';
        } else {
          window.location.href = 'profissional.html';
        }
      }
    })
    .catch(error => console.error('Erro ao cadastrar:', error));
}

// ==================== Login de usuário ====================
function loginUsuario(email, senha) {
  return fetch('http://127.0.0.1:5000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  })
    .then(res => res.json())
    .then(data => {
      if (data.mensagem) {
        alert(data.mensagem);
        localStorage.setItem('email', email);
        localStorage.setItem('tipo', data.tipo); // data.tipo vem do backend no login
        return true;
      } else {
        alert(data.erro);
        return false;
      }
    })
    .catch(error => {
      console.error('Erro no login:', error);
      alert('Erro ao tentar fazer login. Verifique o console.');
      return false;
    });
}

// ==================== Redirecionar por tipo ====================
function redirecionarPorTipo() {
  const tipo = localStorage.getItem('tipo');
  if (tipo === 'cliente') {
    window.location.href = 'cliente.html';
  } else if (tipo === 'prestador') {
    window.location.href = 'profissional.html';
  } else {
    // Se não houver tipo, talvez redirecionar para o login ou página inicial
    console.warn("Tipo de usuário não encontrado no localStorage para redirecionamento.");
    // window.location.href = 'index.html'; // Exemplo
  }
}

// ==================== Manipular envio do formulário de login ====================
// Esta função deve ser chamada pelo onsubmit do form de login ou por um event listener
function realizarLogin(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('email'); // Supondo que sua página de login tenha esses IDs
  const senhaInput = document.getElementById('senha');

  if (!emailInput || !senhaInput) {
    console.error("Campos de email ou senha não encontrados no formulário de login.");
    return;
  }

  const email = emailInput.value;
  const senha = senhaInput.value;

  loginUsuario(email, senha).then(sucesso => {
    if (sucesso) {
      redirecionarPorTipo();
    }
  });
}

// ==================== Contratar profissional ====================
function contratar(cpfProf, area) {
  // Idealmente, o CPF do cliente estaria no localStorage ou seria obtido de forma mais segura
  const clienteCpf = prompt('Informe seu CPF para confirmar a contratação:');
  if (!clienteCpf) return; // Usuário cancelou ou não informou

  const descricao = prompt('Descreva o serviço desejado:');
  if (!descricao) return; // Usuário cancelou ou não informou

  const dados = {
    cliente: clienteCpf,
    profissional: cpfProf,
    area,
    descricao
  };

  fetch('http://127.0.0.1:5000/contratar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(res => res.json())
    .then(data => alert(data.mensagem || data.erro))
    .catch(error => {
        console.error('Erro ao contratar:', error);
        alert('Erro ao tentar contratar. Verifique o console.');
    });
}

// ==================== Carregar histórico ====================
// Esta função precisaria de um local no HTML para exibir o histórico, ex: <div id="historico-container"></div>
function carregarHistorico() {
  // Idealmente, o CPF do usuário logado (cliente ou profissional) seria obtido do localStorage
  const cpf = prompt('Digite seu CPF para ver o histórico');
  if (!cpf) return;

  const historicoContainer = document.getElementById('historico'); // Certifique-se que este ID existe na página apropriada
  if (!historicoContainer) {
    console.warn("Elemento com ID 'historico' não encontrado para exibir o histórico.");
    return;
  }

  fetch(`http://127.0.0.1:5000/historico/${cpf}`)
    .then(res => {
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
        return res.json();
    })
    .then(lista => {
      historicoContainer.innerHTML = ''; // Limpa antes de adicionar novo conteúdo
      if (lista.length === 0) {
        historicoContainer.innerHTML = '<p>Nenhum histórico encontrado.</p>';
        return;
      }
      lista.forEach(item => {
        const p = document.createElement('p');
        // Adapte este HTML conforme a estrutura dos seus dados de histórico
        p.innerHTML = `
          <strong>Área:</strong> ${item.area || 'N/A'}<br>
          <strong>Descrição:</strong> ${item.descricao || 'N/A'}<br>
          <strong>Data:</strong> ${item.data ? new Date(item.data).toLocaleDateString() : 'N/A'}<br>
          <strong>Profissional:</strong> ${item.profissional_nome || 'N/A'} (CPF: ${item.profissional_cpf || 'N/A'})<br>
          <strong>Cliente:</strong> ${item.cliente_nome || 'N/A'} (CPF: ${item.cliente_cpf || 'N/A'})<br>
          <strong>Status:</strong> ${item.status || 'N/A'}<br><hr>
        `;
        historicoContainer.appendChild(p);
      });
    })
    .catch(error => {
        console.error('Erro ao buscar histórico:', error);
        if(historicoContainer) historicoContainer.innerHTML = '<p>Erro ao buscar histórico.</p>';
    });
}

// 1. Função principal que carrega e organiza o painel do profissional
async function carregarPainelProfissional() {
    const cpfProfissional = localStorage.getItem('cpf');
    if (!cpfProfissional) {
        alert("Erro: CPF do profissional não encontrado. Faça login novamente.");
        window.location.href = 'index.html'; // Redireciona para o login
        return;
    }

    console.log(`PROFISSIONAL.HTML: Buscando solicitações para o CPF: ${cpfProfissional}`);

    try {
        const response = await fetch(`http://127.0.0.1:5000/solicitacoes/${cpfProfissional}`);
        if (!response.ok) {
            throw new Error(`Erro na rede: ${response.status}`);
        }
        const solicitacoes = await response.json();

        // Seleciona os containers no HTML
        const novasContainer = document.getElementById('novas-solicitacoes-container');
        const agendadosContainer = document.getElementById('servicos-agendados-container');
        const historicoContainer = document.getElementById('historico-servicos-container');

        // Limpa os containers antes de adicionar os novos cards
        novasContainer.innerHTML = '';
        agendadosContainer.innerHTML = '';
        historicoContainer.innerHTML = '';

        if (solicitacoes.length === 0) {
            novasContainer.innerHTML = '<p>Nenhuma nova solicitação no momento.</p>';
            return;
        }

        // Variáveis para contar se há itens em cada categoria
        let temNovas = false;
        let temAgendados = false;
        let temHistorico = false;

        // Distribui cada solicitação para o container correto baseado no status
        solicitacoes.forEach(solicitacao => {
            const card = criarCardSolicitacao(solicitacao);
            
            if (solicitacao.status === 'pendente') {
                novasContainer.appendChild(card);
                temNovas = true;
            } else if (solicitacao.status === 'aceito') {
                agendadosContainer.appendChild(card);
                temAgendados = true;
            } else { // 'recusado', 'finalizado', etc.
                historicoContainer.appendChild(card);
                temHistorico = true;
            }
        });
        
        // Se após o loop alguma seção continuar vazia, exibe a mensagem padrão
        if (!temNovas) novasContainer.innerHTML = '<p>Nenhuma nova solicitação no momento.</p>';
        if (!temAgendados) agendadosContainer.innerHTML = '<p>Nenhum serviço agendado.</p>';
        if (!temHistorico) historicoContainer.innerHTML = '<p>Nenhum serviço no histórico.</p>';

    } catch (error) {
        console.error("PROFISSIONAL.HTML: Erro ao carregar o painel:", error);
    }
}

// 2. Função auxiliar para criar o HTML de um card de solicitação
function criarCardSolicitacao(solicitacao) {
    const card = document.createElement('div');
    card.className = 'card solicitacao-card'; // Adicionamos uma classe nova para estilização específica se necessário
    card.setAttribute('data-id-solicitacao', solicitacao.id_solicitacao);

    let botoesAcao = '';
    // Só mostra botões de "Aceitar" e "Recusar" se a solicitação estiver pendente
    if (solicitacao.status === 'pendente') {
        botoesAcao = `
            <div class="card-actions">
                <button class="btn-aceitar" onclick="aceitarSolicitacao(${solicitacao.id_solicitacao})">Aceitar</button>
                <button class="btn-recusar" onclick="recusarSolicitacao(${solicitacao.id_solicitacao})">Recusar</button>
            </div>
        `;
    }

    card.innerHTML = `
        <h3>Serviço Solicitado</h3>
        <p><strong>Cliente:</strong> ${solicitacao.cliente_nome || 'Não informado'}</p>
        <p><strong>Contato:</strong> ${solicitacao.cliente_contato || 'Não informado'}</p>
        <p><strong>Data:</strong> ${new Date(solicitacao.data_solicitacao).toLocaleString('pt-BR')}</p>
        <p><strong>Descrição:</strong> ${solicitacao.descricao_servico}</p>
        <p><strong>Status:</strong> <span class="status-${solicitacao.status}">${solicitacao.status}</span></p>
        ${botoesAcao}
    `;
    return card;
}

// 3. Funções para aceitar e recusar uma solicitação
async function atualizarStatusSolicitacao(id_solicitacao, novo_status) {
    console.log(`Atualizando status da solicitação ${id_solicitacao} para ${novo_status}`);
    try {
        const response = await fetch(`http://127.0.0.1:5000/solicitacoes/${id_solicitacao}/atualizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status: novo_status })
        });

        const data = await response.json();
        alert(data.mensagem || data.erro);

        if (response.ok) {
            carregarPainelProfissional(); // Recarrega o painel para refletir a mudança
        }
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Ocorreu um erro ao tentar atualizar a solicitação.");
    }
}

function aceitarSolicitacao(id_solicitacao) {
    atualizarStatusSolicitacao(id_solicitacao, 'aceito');
}

function recusarSolicitacao(id_solicitacao) {
    atualizarStatusSolicitacao(id_solicitacao, 'recusado');
}


// ==================== Lógica para CLIENTE.HTML ====================
async function carregarAreasDeAtuacao() {
  console.log("CLIENTE.HTML: Iniciando carregarAreasDeAtuacao com ÁREAS PRÉ-DEFINIDAS...");
  const secaoAreas = document.getElementById('secao-areas-atuacao');
  const secaoProfissionais = document.getElementById('secao-profissionais');
  const listaAreasContainer = document.getElementById('lista-areas-atuacao');

  if (!listaAreasContainer || !secaoAreas || !secaoProfissionais) {
    console.error("CLIENTE.HTML: Elementos de seção ou lista de áreas não encontrados!");
    return;
  }

  listaAreasContainer.innerHTML = ''; // Limpa o container

  const areasParaExibir = MINHAS_AREAS_PREDEFINIDAS;

  if (!areasParaExibir || areasParaExibir.length === 0) {
    listaAreasContainer.innerHTML = '<p>Nenhuma área de atuação pré-definida encontrada para exibir.</p>';
    console.warn("CLIENTE.HTML: Lista de áreas pré-definidas está vazia ou não foi encontrada.");
    return;
  }

  areasParaExibir.forEach(areaInfo => {
    const areaNome = areaInfo.nome;
    const areaId = areaInfo.id; // Este 'id' deve corresponder ao valor do campo 'area' nos dados de profissionais

    console.log("CLIENTE.HTML: Criando card para área pré-definida:", areaNome);

    const areaCard = document.createElement('div');
    areaCard.className = 'area-card'; // Certifique-se que você tem estilos para .area-card no CSS
    areaCard.setAttribute('data-area-id', areaId);
    
    areaCard.innerHTML = `
      <h3>${areaNome}</h3>
      <p>Ver profissionais de ${areaNome}</p>
    `;

    areaCard.addEventListener('click', async () => {
      console.log(`CLIENTE.HTML: Área clicada: ${areaNome} (ID: ${areaId})`);
      secaoAreas.style.display = 'none';
      secaoProfissionais.style.display = 'block';
      document.getElementById('titulo-profissionais').textContent = `Profissionais de ${areaNome}`;
      
      try {
        const response = await fetch('http://127.0.0.1:5000/profissionais');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const todosProfissionais = await response.json();
        console.log("CLIENTE.HTML: Todos profissionais recebidos para filtrar:", todosProfissionais);
        carregarProfissionaisPorArea(areaId, todosProfissionais);
      } catch (error) {
        console.error("CLIENTE.HTML: Erro ao buscar todos os profissionais para filtrar:", error);
        document.getElementById('lista-profissionais').innerHTML = `<p>Erro ao carregar profissionais da área ${areaNome}.</p>`;
      }
    });
    listaAreasContainer.appendChild(areaCard);
  });
}

function carregarProfissionaisPorArea(areaId, todosProfissionais) { 
  console.log(`CLIENTE.HTML: Carregando profissionais para área ID: ${areaId}`);
  const container = document.getElementById('lista-profissionais');
  if (!container) {
      console.error("CLIENTE.HTML: Container #lista-profissionais não encontrado.");
      return;
  }

  container.innerHTML = ''; // Limpa antes de carregar

  // Filtra profissionais. Garante que p.area exista antes de comparar.
  const profissionaisDaArea = todosProfissionais.filter(p => p.area && p.area.toLowerCase() === areaId.toLowerCase());

  console.log(`CLIENTE.HTML: Profissionais encontrados para ${areaId}:`, profissionaisDaArea);


  if (profissionaisDaArea.length === 0) {
    container.innerHTML = `<p>Nenhum profissional encontrado para esta área (${areaId}).</p>`;
    return;
  }

  profissionaisDaArea.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    
    card.innerHTML = `
      <h3>${p.nome}</h3>
      <p><strong>Área:</strong> ${p.area || 'Não informada'}</p>
      <p><strong>Email:</strong> ${p.email || 'Não informado'}</p>
      <p><strong>Cidade:</strong> ${p.cidade || 'Não informada'}</p>
      <p><strong>Contato:</strong> ${p.contato || 'Não informado'}</p>
    `;

    const btnContratar = document.createElement('button');
    btnContratar.textContent = 'Contratar';
    btnContratar.className = 'btn-card-action'; // Adicione uma classe para estilização se necessário
    btnContratar.onclick = () => contratar(p.cpf, p.area);
    card.appendChild(btnContratar);

    container.appendChild(card);
  });
}


// ==================== LÓGICA PRINCIPAL EXECUTADA QUANDO O DOM ESTÁ PRONTO ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM Completamente Carregado e Parseado.");
  const paginaAtual = window.location.pathname.split('/').pop();
  console.log("Página Atual Detectada:", paginaAtual);

  // --- Lógica para a PÁGINA DO CLIENTE ---
  if (paginaAtual === 'cliente.html') {
    console.log("Executando lógica para cliente.html");
    const secaoAreas = document.getElementById('secao-areas-atuacao');
    const secaoProfissionais = document.getElementById('secao-profissionais');
    const btnVoltar = document.getElementById('btn-voltar-para-areas');

    if (secaoAreas && secaoProfissionais) {
        secaoAreas.style.display = 'block';
        secaoProfissionais.style.display = 'none';
        carregarAreasDeAtuacao();
    } else {
        console.error("CLIENTE.HTML: Falha ao encontrar secao-areas-atuacao ou secao-profissionais.");
    }

    if (btnVoltar) {
      btnVoltar.addEventListener('click', () => {
        console.log("CLIENTE.HTML: Botão Voltar clicado.");
        if(secaoProfissionais) secaoProfissionais.style.display = 'none';
        const listaProfissionais = document.getElementById('lista-profissionais');
        if(listaProfissionais) listaProfissionais.innerHTML = '';
        if(secaoAreas) secaoAreas.style.display = 'block';
        const tituloProfissionais = document.getElementById('titulo-profissionais');
        if(tituloProfissionais) tituloProfissionais.textContent = 'Profissionais';
      });
    } else {
        console.warn("CLIENTE.HTML: Botão #btn-voltar-para-areas não encontrado.");
    }
  }

  // --- Lógica para a PÁGINA DE CADASTRO ---
  // Verificamos pela existência do form de cadastro para maior robustez
  const formCadastro = document.getElementById('formCadastro');
  if (formCadastro) { // Implica que estamos na página de cadastro ou uma com esse form
    console.log("Executando lógica para página com #formCadastro (provavelmente cadastro.html)");
    const tipoUsuario = document.getElementById('tipo');
    const areaContainer = document.getElementById('area-container');

    console.log("CADASTRO.HTML: Elemento tipoUsuario:", tipoUsuario);
    console.log("CADASTRO.HTML: Elemento areaContainer:", areaContainer);

    if (tipoUsuario && areaContainer) {
      // Define o estado inicial do areaContainer
      if (tipoUsuario.value !== 'prestador') {
        areaContainer.style.display = 'none';
      } else {
        areaContainer.style.display = 'block';
      }
      console.log("CADASTRO.HTML: Estado inicial do areaContainer.style.display:", areaContainer.style.display);

      tipoUsuario.addEventListener('change', () => {
        console.log("CADASTRO.HTML: Evento 'change' no tipoUsuario. Novo valor:", tipoUsuario.value);
        if (tipoUsuario.value === 'prestador') {
          areaContainer.style.display = 'block';
        } else {
          areaContainer.style.display = 'none';
        }
        console.log("CADASTRO.HTML: Novo display do areaContainer após 'change':", areaContainer.style.display);
      });
    } else {
      console.error("CADASTRO.HTML: ERRO: Não foi possível encontrar 'tipoUsuario' ou 'areaContainer'. Verifique os IDs no HTML.");
    }

    // Validação do select de área no submit do formulário de cadastro
    formCadastro.addEventListener('submit', (e) => {
      // A função cadastrarUsuario já é chamada pelo onsubmit="cadastrarUsuario(event)" no HTML.
      // Este listener adicional pode ser para validações extras ANTES de cadastrarUsuario ser chamado.
      // Se cadastrarUsuario já faz a validação, este pode não ser necessário ou pode ser integrado.
      // Por ora, vou manter a validação que você tinha.
      if (tipoUsuario && tipoUsuario.value === 'prestador') {
        const areaSelect = document.getElementById('area');
        if (areaSelect && !areaSelect.value) {
          console.log("CADASTRO.HTML: Validação falhou - área não selecionada para prestador.");
          e.preventDefault(); // Impede o envio do formulário (chamada a cadastrarUsuario)
          alert('Por favor, selecione uma área de atuação válida.');
        }
      }
    });
  }

  if (paginaAtual === 'profissional.html') {
        console.log("Executando lógica para profissional.html");
        carregarPainelProfissional();
    }

  // --- Lógica para a PÁGINA DE LOGIN ---
  // Verificamos pela existência do form de login
  const formLogin = document.getElementById('formLogin'); // Supondo que seu form de login tenha id="formLogin"
  if (formLogin) {
    console.log("Executando lógica para página com #formLogin (provavelmente index.html ou login.html)");
    formLogin.addEventListener('submit', realizarLogin);
  }

});

// A função listarProfissionais original foi removida pois sua funcionalidade
// para cliente.html foi substituída por carregarAreasDeAtuacao e carregarProfissionaisPorArea.
// Se ela for usada em outra página (ex: profissional.html para ver outros profissionais),
// você pode mantê-la e adicionar uma condição específica no DOMContentLoaded para chamá-la.

console.log("script.js carregado e parseado.");