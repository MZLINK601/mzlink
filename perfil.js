document.addEventListener("DOMContentLoaded", async function () {
    const SUPABASE_URL = "https://uuswtafwkgrzmzbkgnjq.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vd6DmOxZuXD0cVhIJMtbfQ_-8cWtU7P";
    const CHAVE = "mzlink_sessao";
    const conteudo = document.getElementById("conteudo");

    let sessao = null;
    try { sessao = JSON.parse(localStorage.getItem(CHAVE)); } catch(e) {}

    if (!sessao || !sessao.access_token) {
        window.location.href = "login.html?next=perfil.html";
        return;
    }

    let user = null;
    let userMeta = null;
    let perfilDB = null;
    let arquivoAvatarOnboarding = null; 

    const headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + sessao.access_token
    };

    try {
        const rUser = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: headers });
        if (!rUser.ok) {
            localStorage.removeItem(CHAVE);
            window.location.href = "login.html";
            return;
        }
        user = await rUser.json();
        userMeta = user.user_metadata || {};

        // A CORREÇÃO ESTÁ AQUI: &categoria=eq.loja
        const rPerfil = await fetch(SUPABASE_URL + "/rest/v1/profissionais?user_id=eq." + encodeURIComponent(user.id) + "&categoria=eq.loja&limit=1", { headers: headers });
        
        if (rPerfil.ok) {
            const lista = await rPerfil.json();
            if (lista && lista.length > 0) perfilDB = lista[0];
        }

        if (!perfilDB) {
            renderizarOnboarding();
        } else {
            renderizarPerfil();
        }

    } catch (erro) {
        conteudo.innerHTML = `<div class="aviso erro visivel" style="margin:20px;">Erro de ligação. Tenta novamente.</div>`;
    }

    function renderizarOnboarding() {
        let nomeAuth = userMeta.nome || userMeta.name || user.email.split("@")[0];
        let telAuth = String(userMeta.whatsapp || "").replace(/^258/, "");
        let inicial = nomeAuth.charAt(0).toUpperCase();

        conteudo.innerHTML = `
            <div class="hero" style="padding-top: 10px;">
                <div class="avatar-grande" id="avatarContainerOnboarding" onclick="document.getElementById('inputAvatarOnboarding').click()">
                    <span id="avatarLetraOnboarding">${inicial}</span>
                    <img id="avatarImagemOnboarding" style="display:none;">
                    <div class="icone-camara">📷</div>
                </div>
                <input type="file" id="inputAvatarOnboarding" accept="image/*" style="display: none;">
                
                <h1 style="color: #1E40AF; font-size: 1.6rem; margin-top: 15px;">👋 Bem-vindo ao MZLINK!</h1>
                <p style="color: #667085; margin-bottom: 20px; font-size: 0.95rem;">A tua conta foi criada. Para começares a vender, preenche os dados da tua loja abaixo.</p>
            </div>

            <div class="card" style="border-left-color: #1E40AF;">
                <h2>🏪 Criar Perfil de Vendedor</h2>
                <form id="formOnboarding">
                    <div class="campo">
                        <div class="campo-info">
                            <label>Nome da Loja / Negócio</label>
                            <input type="text" id="novoNome" required value="${nomeAuth}" placeholder="Ex: João Telemóveis" style="width:100%; border:none; border-bottom:1px solid #ccc; font-size:1rem; font-weight:700; padding:5px 0; outline:none;">
                        </div>
                    </div>
                    <div class="campo">
                        <div class="campo-info">
                            <label>WhatsApp (9 dígitos)</label>
                            <input type="tel" id="novoWhats" required value="${telAuth}" placeholder="Ex: 841234567" style="width:100%; border:none; border-bottom:1px solid #ccc; font-size:1rem; font-weight:700; padding:5px 0; outline:none;">
                        </div>
                    </div>
                    <div class="campo">
                        <div class="campo-info">
                            <label>Província</label>
                            <select id="novoLocal" required style="width:100%; border:none; border-bottom:1px solid #ccc; font-size:1rem; font-weight:700; padding:5px 0; outline:none; background:transparent;">
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
                    </div>
                    <button type="submit" id="btnCriarLoja" class="btn-acao principal" style="margin-top: 20px;">Guardar e Começar a Vender</button>
                    <p id="msgOnboarding" style="text-align:center; font-weight:bold; margin-top:10px; color:red; font-size:0.85rem;"></p>
                </form>
            </div>
        `;

        document.getElementById("inputAvatarOnboarding").addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) { alert("Foto maior que 2MB."); return; }
                arquivoAvatarOnboarding = file;
                const reader = new FileReader();
                reader.onload = function(ev) {
                    document.getElementById("avatarLetraOnboarding").style.display = "none";
                    const img = document.getElementById("avatarImagemOnboarding");
                    img.src = ev.target.result;
                    img.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById("formOnboarding").addEventListener("submit", async function (e) {
            e.preventDefault();
            const btn = document.getElementById("btnCriarLoja");
            const msg = document.getElementById("msgOnboarding");
            
            const nome = document.getElementById("novoNome").value.trim();
            const whats = document.getElementById("novoWhats").value.replace(/\s/g, "");
            const local = document.getElementById("novoLocal").value;

            if (!/^(8[2-7])\d{7}$/.test(whats)) {
                msg.textContent = "Número de WhatsApp inválido (ex: 841234567).";
                return;
            }

            btn.textContent = "A criar loja...";
            btn.disabled = true;

            try {
                let urlAvatarFinal = userMeta.avatar_url || null;

                if (arquivoAvatarOnboarding) {
                    const ext = arquivoAvatarOnboarding.name.split(".").pop() || "jpg";
                    const caminho = user.id + "/avatar." + ext;

                    const rUpload = await fetch(SUPABASE_URL + "/storage/v1/object/avatares/" + caminho, {
                        method: "POST",
                        headers: {
                            "apikey": SUPABASE_KEY,
                            "Authorization": "Bearer " + sessao.access_token,
                            "Content-Type": arquivoAvatarOnboarding.type,
                            "x-upsert": "true"
                        },
                        body: arquivoAvatarOnboarding
                    });

                    if (rUpload.ok) {
                        urlAvatarFinal = SUPABASE_URL + "/storage/v1/object/public/avatares/" + caminho;
                        await fetch(SUPABASE_URL + "/auth/v1/user", {
                            method: "PUT",
                            headers: { ...headers, "Content-Type": "application/json" },
                            body: JSON.stringify({ data: { ...userMeta, nome: nome, whatsapp: "258" + whats, avatar_url: urlAvatarFinal } })
                        });
                        userMeta.avatar_url = urlAvatarFinal;
                    }
                }

                const dadosLoja = {
                    user_id: user.id,
                    nome: nome,
                    whatsapp: "258" + whats,
                    local: local,
                    plano: "basico",
                    categoria: "loja",
                    tipo: "Perfil da Loja",
                    preco: null, 
                    fotos: []
                };

                const res = await fetch(SUPABASE_URL + "/rest/v1/profissionais", {
                    method: "POST",
                    headers: { ...headers, "Content-Type": "application/json" },
                    body: JSON.stringify(dadosLoja)
                });

                if (res.ok) {
                    msg.style.color = "green";
                    msg.textContent = "Loja criada com sucesso! A carregar...";
                    setTimeout(() => window.location.href = "perfil.html?v=6000", 1000);
                } else {
                    const erro = await res.json();
                    msg.textContent = "Erro: " + (erro.message || "Tenta novamente.");
                    btn.textContent = "Guardar e Começar a Vender";
                    btn.disabled = false;
                }
            } catch (err) {
                msg.textContent = "Erro de ligação.";
                btn.textContent = "Guardar e Começar a Vender";
                btn.disabled = false;
            }
        });
    }

    function renderizarPerfil() {
        const nome = perfilDB.nome;
        const telefone = String(perfilDB.whatsapp).replace(/^258/, "");
        const inicial = nome.charAt(0).toUpperCase();
        const ehPremium = perfilDB.plano === "premium";
        const urlAvatar = userMeta.avatar_url;

        const cliques = perfilDB.cliques_whatsapp || 0;
        const visualizacoes = perfilDB.visualizacoes || 0;

        conteudo.innerHTML = `
            <div class="hero">
                <div class="avatar-grande ${ehPremium ? 'premium' : ''}" onclick="document.getElementById('inputAvatar').click()">
                    <span id="avatarLetra" style="${urlAvatar ? 'display:none;' : ''}">${inicial}</span>
                    <img src="${urlAvatar || ''}" style="${urlAvatar ? 'display:block; width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0;' : 'display:none;'}">
                    <div class="icone-camara">📷</div>
                </div>
                <input type="file" id="inputAvatar" accept="image/*" style="display: none;">
                <div class="badge-moz">🇲🇿 Orgulho Nacional</div>
                <h1>${nome}</h1>
                <p class="email">${user.email}</p>
                <span class="plano-badge ${ehPremium ? 'premium' : 'basico'}">${ehPremium ? '⭐ PREMIUM' : '🆓 Básico'}</span>
            </div>
            
            <div class="card">
                <h2>📝 Dados da Loja</h2>
                <div class="campo"><div class="campo-info"><label>Nome do Negócio</label><div class="valor">${nome}</div></div><button class="btn-editar" onclick="window.MZPerfil.editarNome()">✏️ Editar</button></div>
                <div class="campo"><div class="campo-info"><label>WhatsApp</label><div class="valor">${telefone ? '258' + telefone : '—'}</div></div><button class="btn-editar" onclick="window.MZPerfil.editarTelefone()">✏️ Editar</button></div>
                <div class="campo"><div class="campo-info"><label>Localização</label><div class="valor">📍 ${perfilDB.local}</div></div></div>
            </div>

            ${ehPremium ? `
            <div class="card" style="border-left-color: #d4af37; background: #fffbeb;">
                <h2 style="color: #b45309;">📊 Estatísticas Premium</h2>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <div style="flex: 1; background: #fff; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <span style="font-size: 1.5rem;">🔥</span><br>
                        <strong style="font-size: 1.2rem; color: #0f1115;">${cliques}</strong><br>
                        <small style="color: #667085; font-size:0.7rem;">Contactos WhatsApp</small>
                    </div>
                    <div style="flex: 1; background: #fff; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <span style="font-size: 1.5rem;">👀</span><br>
                        <strong style="font-size: 1.2rem; color: #0f1115;">${visualizacoes}</strong><br>
                        <small style="color: #667085; font-size:0.7rem;">Visualizações</small>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="card">
                <h2>📢 Os meus anúncios</h2>
                <a href="publicar.html" class="btn-acao principal">📢 Publicar novo anúncio</a>
                <a href="index.html" class="btn-voltar" style="margin-top:10px; border-color:#ccc;">Ver anúncios no site</a>
            </div>
            <div class="card">
                <h2>🔐 Segurança</h2>
                <button class="btn-acao sair" onclick="window.MZPerfil.sair()">🚪 Sair da conta</button>
            </div>
        `;

        document.getElementById("inputAvatar").addEventListener("change", async function (e) {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { alert("A foto é muito grande. Máximo 2MB."); return; }

            try {
                document.getElementById("avatarLetra").textContent = "...";
                const ext = file.name.split(".").pop() || "jpg";
                const caminho = user.id + "/avatar." + ext;

                const rUpload = await fetch(SUPABASE_URL + "/storage/v1/object/avatares/" + caminho, {
                    method: "POST",
                    headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + sessao.access_token, "Content-Type": file.type, "x-upsert": "true" },
                    body: file
                });
                if (!rUpload.ok) { alert("Erro ao enviar a foto."); return; }

                const urlPublica = SUPABASE_URL + "/storage/v1/object/public/avatares/" + caminho;
                const novoMeta = { ...userMeta, avatar_url: urlPublica };
                
                await fetch(SUPABASE_URL + "/auth/v1/user", {
                    method: "PUT",
                    headers: { ...headers, "Content-Type": "application/json" },
                    body: JSON.stringify({ data: novoMeta })
                });

                userMeta = novoMeta;
                window.location.href = "perfil.html?v=6001";
            } catch (err) { alert("Erro de ligação."); }
        });
    }

    window.MZPerfil = {
        editarNome: function() {
            const novo = prompt("✏️ Editar nome da loja:", perfilDB.nome);
            if (!novo || novo.trim().length < 2) return;
            guardar({ nome: novo.trim() });
        },
        editarTelefone: function() {
            const atual = String(perfilDB.whatsapp).replace(/^258/, "");
            let novo = prompt("✏️ Editar WhatsApp (ex: 841234567):", atual);
            if (novo === null) return;
            novo = novo.replace(/\s/g, "");
            if (!/^(8[2-7])\d{7}$/.test(novo)) { alert("Número inválido."); return; }
            guardar({ whatsapp: "258" + novo });
        },
        sair: function() {
            if (!confirm("Queres sair da conta?")) return;
            localStorage.removeItem(CHAVE);
            window.location.href = "index.html";
        }
    };

    async function guardar(dados) {
        try {
            await fetch(SUPABASE_URL + "/rest/v1/profissionais?user_id=eq." + user.id + "&categoria=eq.loja", {
                method: "PATCH",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });

            const novoMeta = { ...userMeta, ...dados };
            await fetch(SUPABASE_URL + "/auth/v1/user", {
                method: "PUT",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ data: novoMeta })
            });

            userMeta = novoMeta;
            Object.assign(perfilDB, dados);

            if (dados.nome) {
                sessao.name = dados.nome;
                localStorage.setItem(CHAVE, JSON.stringify(sessao));
            }
            window.location.href = "perfil.html?v=6002";
        } catch (e) { alert("Erro ao guardar. Tenta de novo."); }
    }
});
