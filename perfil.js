document.addEventListener("DOMContentLoaded", async function () {
    const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";
    const conteudo = document.getElementById("conteudo");

    // 1. Verificar se o utilizador está logado
    let sessaoStr = localStorage.getItem("mzlink_sessao");
    if (!sessaoStr) {
        window.location.href = "login.html";
        return;
    }

    let sessao = JSON.parse(sessaoStr);
    
    // 2. Buscar dados do perfil do utilizador no Supabase
    try {
        const res = await fetch(SUPABASE_URL + `/rest/v1/profissionais?user_id=eq.${sessao.user.id}&select=*`, {
            headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.access_token }
        });
        const perfil = await res.json();

        // ==========================================
        // CENÁRIO A: O UTILIZADOR É NOVO (Não tem perfil)
        // ==========================================
        if (perfil.length === 0) {
            conteudo.innerHTML = `
                <div class="hero" style="padding-top: 10px;">
                    <h1 style="color: #1E40AF;">👋 Bem-vindo ao MZLINK!</h1>
                    <p style="color: #667085; margin-bottom: 20px;">A tua conta foi criada com sucesso. Para começares a vender, completa o teu perfil de vendedor abaixo.</p>
                </div>
                <div class="card" style="border-left-color: #1E40AF;">
                    <h2>Criar Perfil de Vendedor</h2>
                    <form id="formNovoPerfil">
                        <div style="margin-bottom: 15px;">
                            <label style="display:block; font-size:0.8rem; font-weight:800; color:#667085; margin-bottom:5px;">NOME DA LOJA / NEGÓCIO</label>
                            <input type="text" id="novoNome" required placeholder="Ex: João Telemóveis" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:8px; font-family:inherit; font-weight:600;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display:block; font-size:0.8rem; font-weight:800; color:#667085; margin-bottom:5px;">NÚMERO DE WHATSAPP</label>
                            <input type="tel" id="novoWhats" required placeholder="Ex: 84 000 0000" style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:8px; font-family:inherit; font-weight:600;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display:block; font-size:0.8rem; font-weight:800; color:#667085; margin-bottom:5px;">PROVÍNCIA</label>
                            <select id="novoLocal" required style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:8px; font-family:inherit; font-weight:600; background:#fff;">
                                <option value="">Escolhe a tua província</option>
                                <option value="Maputo">Maputo</option>
                                <option value="Gaza">Gaza</option>
                                <option value="Inhambane">Inhambane</option>
                                <option value="Sofala">Sofala</option>
                                <option value="Manica">Manica</option>
                                <option value="Tete">Tete</option>
                                <option value="Zambézia">Zambézia</option>
                                <option value="Nampula">Nampula</option>
                                <option value="Niassa">Niassa</option>
                                <option value="Cabo Delgado">Cabo Delgado</option>
                            </select>
                        </div>
                        <button type="submit" id="btnCriarPerfil" class="btn-acao principal">Guardar e Começar a Vender</button>
                        <p id="msgNovoPerfil" style="text-align:center; font-weight:bold; margin-top:10px; color:red;"></p>
                    </form>
                </div>
            `;

            // Lógica para guardar o novo perfil
            document.getElementById("formNovoPerfil").addEventListener("submit", async function(e) {
                e.preventDefault();
                const btn = document.getElementById("btnCriarPerfil");
                const msg = document.getElementById("msgNovoPerfil");
                btn.textContent = "A criar perfil...";
                btn.disabled = true;

                const dadosNovos = {
                    user_id: sessao.user.id,
                    nome: document.getElementById("novoNome").value.trim(),
                    whatsapp: document.getElementById("novoWhats").value.trim(),
                    local: document.getElementById("novoLocal").value,
                    plano: "basico"
                };

                try {
                    const saveRes = await fetch(SUPABASE_URL + "/rest/v1/profissionais", {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json", 
                            apikey: SUPABASE_KEY,
                            Authorization: "Bearer " + sessao.access_token
                        },
                        body: JSON.stringify(dadosNovos)
                    });

                    if (saveRes.ok) {
                        msg.style.color = "green";
                        msg.textContent = "Perfil criado! A redirecionar...";
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        const erro = await saveRes.json();
                        msg.textContent = "Erro ao criar: " + (erro.message || "Tenta novamente.");
                        btn.textContent = "Guardar e Começar a Vender";
                        btn.disabled = false;
                    }
                } catch (err) {
                    msg.textContent = "Erro de rede.";
                    btn.textContent = "Guardar e Começar a Vender";
                    btn.disabled = false;
                }
            });

        } 
        // ==========================================
        // CENÁRIO B: O UTILIZADOR JÁ EXISTE (Mostrar Perfil Normal)
        // ==========================================
        else {
            const dados = perfil[0];
            const isPremium = dados.plano === "premium";
            const inicial = dados.nome ? dados.nome.charAt(0).toUpperCase() : "U";

            conteudo.innerHTML = `
                <div class="hero">
                    <div class="avatar-grande ${isPremium ? 'premium' : ''}">
                        ${inicial}
                        <div class="icone-camara">📷</div>
                    </div>
                    <h1>${dados.nome}</h1>
                    <p class="email">${sessao.user.email}</p>
                    
                    <div class="badge-moz">🇲🇿 Orgulho Nacional</div><br>
                    
                    <span class="plano-badge ${isPremium ? 'premium' : 'basico'}">
                        ${isPremium ? '👑 PREMIUM' : 'Básico'}
                    </span>
                </div>

                <div class="card">
                    <h2>Dados Públicos</h2>
                    <div class="campo">
                        <div class="campo-info">
                            <label>Nome da Loja</label>
                            <div class="valor">${dados.nome}</div>
                        </div>
                    </div>
                    <div class="campo">
                        <div class="campo-info">
                            <label>WhatsApp</label>
                            <div class="valor">${dados.whatsapp}</div>
                        </div>
                    </div>
                    <div class="campo">
                        <div class="campo-info">
                            <label>Localização</label>
                            <div class="valor">${dados.local}</div>
                        </div>
                    </div>
                </div>

                <a href="index.html" class="btn-voltar">Voltar à Página Inicial</a>
            `;
        }

    } catch (erro) {
        console.error(erro);
        conteudo.innerHTML = `<div class="aviso erro visivel">Erro ao carregar o perfil. Verifica a tua ligação à internet.</div>`;
    }
});
