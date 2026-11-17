document.addEventListener("DOMContentLoaded", async function () {
    // 1. Verificar Sessão
    if (typeof MZ === "undefined" || !MZ.sessaoValida) return;
    const sessao = await MZ.sessaoValida();
    if (!sessao || !sessao.access_token) {
        window.location.href = "login.html";
        return;
    }

    const SUPABASE_URL = MZ.url;
    const SUPABASE_KEY = MZ.key;

    try {
        // 2. Buscar dados do Utilizador
        const userRes = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.access_token } });
        const user = await userRes.json();

        // 3. Buscar Perfil na tabela 'profissionais'
        const perfilRes = await fetch(SUPABASE_URL + "/rest/v1/profissionais?user_id=eq." + user.id + "&limit=1", {
            headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.access_token }
        });
        const perfilDados = await perfilRes.json();
        const perfil = perfilDados.length > 0 ? perfilDados[0] : null;

        // 4. Desenhar o Perfil no Ecrã
        renderizarPerfil(user, perfil);

        // 5. Carregar as Vendas Protegidas (para a lista verde)
        carregarVendasProtegidasVendedor(user.id);

        // 6. Carregar Saldo e Notificações (O Novo Painel de Controlo)
        carregarSaldoENotificacoes(user.id);

    } catch (e) {
        console.error("Erro ao carregar perfil:", e);
        document.getElementById("conteudo").innerHTML = "<div class='aviso erro visivel'>Erro ao carregar perfil. Faz login novamente.</div>";
    }
});

// ===== FUNÇÃO QUE DESENHA O PERFIL E OS CARTÕES DE SALDO =====
function renderizarPerfil(user, perfil) {
    const nome = perfil?.nome || user.user_metadata?.nome || "Utilizador";
    const email = user.email;
    const whatsapp = perfil?.whatsapp || "Não definido";
    const local = perfil?.local || "Não definido";
    const plano = perfil?.plano || "basico";
    const avatarUrl = perfil?.avatar_url || "";
    const isPremium = plano === "premium";

    const iniciais = nome.charAt(0).toUpperCase();
    const corAvatar = isPremium ? "premium" : "";
    
    const html = `
        <div class="hero">
            <div class="avatar-grande ${corAvatar}" id="avatarContainer">
                ${avatarUrl ? `<img src="${avatarUrl}" style="display:block;">` : iniciais}
                <div class="icone-camara">📷</div>
            </div>
            <h1>${nome}</h1>
            <p class="email">${email}</p>
            <div class="badge-moz">🇲🇿 Membro MZLINK</div>
            <div class="plano-badge ${plano}">
                ${isPremium ? "👑 PREMIUM" : "Básico"}
            </div>
        </div>

        <!-- NOTIFICAÇÕES (Aparece só se tiver vendas para entregar) -->
        <div id="alertaNotificacao" style="display: none; background: #dc2626; color: white; padding: 12px; border-radius: 8px; font-weight: 800; text-align: center; margin-bottom: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(220,38,38,0.3);" onclick="document.getElementById('seccaoVendasProtegidas').scrollIntoView({behavior: 'smooth'})">
            🔔 Tens vendas pendentes! Toca para ver.
        </div>

        <!-- CARTÕES DE SALDO -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; max-width: 500px; margin-left: auto; margin-right: auto;">
            <div style="background: #0f1115; border: 1px solid #d4af37; border-radius: 12px; padding: 15px; text-align: center; color: white;">
                <p style="margin: 0; font-size: 0.75rem; color: #c9ccd3; font-weight: 700;">🛡️ Saldo a Receber</p>
                <h3 id="saldoPendente" style="margin: 5px 0 0 0; color: #d4af37; font-size: 1.2rem;">0.00 MT</h3>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #16a34a; border-radius: 12px; padding: 15px; text-align: center;">
                <p style="margin: 0; font-size: 0.75rem; color: #166534; font-weight: 700;">✅ Saldo Recebido</p>
                <h3 id="saldoRecebido" style="margin: 5px 0 0 0; color: #16a34a; font-size: 1.2rem;">0.00 MT</h3>
            </div>
        </div>

        <div class="card">
            <h2>Informações Pessoais</h2>
            <div class="campo">
                <div class="campo-info">
                    <label>Nome</label>
                    <div class="valor">${nome}</div>
                </div>
            </div>
            <div class="campo">
                <div class="campo-info">
                    <label>WhatsApp</label>
                    <div class="valor">${whatsapp}</div>
                </div>
            </div>
            <div class="campo">
                <div class="campo-info">
                    <label>Localização</label>
                    <div class="valor">${local}</div>
                </div>
            </div>
            <div class="campo">
                <div class="campo-info">
                    <label>E-mail</label>
                    <div class="valor bloqueado">${email}</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Ações</h2>
            <a href="index.html" class="btn-acao principal">🏠 Ir para o Início</a>
            <button onclick="sair()" class="btn-acao sair">🚪 Terminar Sessão</button>
        </div>
    `;

    document.getElementById("conteudo").innerHTML = html;
}

// ===== FUNÇÃO QUE CALCULA O SALDO E AS NOTIFICAÇÕES =====
async function carregarSaldoENotificacoes(userId) {
    try {
        const sessao = await MZ.sessaoValida();
        
        // Vai buscar todas as vendas onde ele é o vendedor
        const r = await fetch(MZ.url + "/rest/v1/vendas_protegidas?vendedor_id=eq." + userId + "&select=valor_produto,status", {
            headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
        });

        if (!r.ok) return;
        const vendas = await r.json();

        let saldoPendente = 0;
        let saldoRecebido = 0;
        let vendasPendentes = 0;

        vendas.forEach(v => {
            // Dinheiro que está no Cofre (Pago ou Enviado)
            if (v.status === 'pago' || v.status === 'enviado') {
                saldoPendente += Number(v.valor_produto);
            } 
            // Dinheiro que já foi libertado para o vendedor
            else if (v.status === 'concluido') {
                saldoRecebido += Number(v.valor_produto);
            }

            // Conta quantas vendas precisam de ação (entregar o produto)
            if (v.status === 'pago') {
                vendasPendentes++;
            }
        });

        // Atualiza os valores nos cartões
        const elPendente = document.getElementById("saldoPendente");
        const elRecebido = document.getElementById("saldoRecebido");
        const elAlerta = document.getElementById("alertaNotificacao");

        if (elPendente) elPendente.innerText = saldoPendente.toFixed(2) + " MT";
        if (elRecebido) elRecebido.innerText = saldoRecebido.toFixed(2) + " MT";

        if (vendasPendentes > 0 && elAlerta) {
            elAlerta.style.display = "block";
            elAlerta.innerHTML = `🔔 Tens ${vendasPendentes} venda(s) paga(s) pronta(s) para entrega!`;
        }

    } catch (e) {
        console.error("Erro ao carregar saldo e notificações:", e);
    }
}

// ===== LÓGICA DE VENDAS PROTEGIDAS (A LISTA VERDE) =====
async function carregarVendasProtegidasVendedor(userId) {
    const seccao = document.getElementById('seccaoVendasProtegidas');
    const listaDiv = document.getElementById('listaVendasVendedor');
    if (!seccao || !listaDiv) return;

    try {
        const sessao = await MZ.sessaoValida();
        
        // Busca as vendas onde o status é 'pago' ou 'enviado'
        const r = await fetch(MZ.url + "/rest/v1/vendas_protegidas?vendedor_id=eq." + userId + "&status=in.(pago,enviado)&order=criado_em.desc", {
            headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token }
        });

        if (!r.ok) return;
        const vendas = await r.json();

        if (vendas.length === 0) {
            seccao.style.display = 'none';
            return;
        }

        seccao.style.display = 'block';
        let html = "";

        vendas.forEach(venda => {
            const numeroComprador = String(venda.whatsapp_comprador || "").replace(/\D/g, '');
            const msgZap = encodeURIComponent("Olá! Vi que compraste o meu produto no MZLINK (Pedido #" + venda.id + "). Já recebi a confirmação do pagamento. Como combinamos a entrega?");
            
            const jaEnviado = venda.status === 'enviado';
            const botaoEnviado = jaEnviado 
                ? `<button disabled style="flex: 1; background: #cbd5e1; color: #475569; border: none; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">✅ Produto Enviado</button>`
                : `<button onclick="marcarComoEnviado(${venda.id})" style="flex: 1; background: #1E40AF; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">📦 Marcar como Enviado</button>`;

            html += `
                <div style="background: #f0fdf4; border: 1px solid #16a34a; border-radius: 8px; padding: 15px; position: relative; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong style="color: #166534; font-size: 1rem;">Venda #${venda.id}</strong>
                            <p style="margin: 5px 0; font-size: 0.85rem; color: #475569;">
                                Valor a receber: <strong style="color: #16a34a; font-size: 1.1rem;">${Number(venda.valor_produto).toFixed(2)} MT</strong>
                            </p>
                            <p style="margin: 0; font-size: 0.75rem; color: #64748b;">Comprovativo: ${venda.comprovativo}</p>
                        </div>
                        <span style="background: ${jaEnviado ? '#1E40AF' : '#16a34a'}; color: white; font-size: 0.7rem; font-weight: bold; padding: 4px 8px; border-radius: 20px;">
                            ${jaEnviado ? 'ENVIADO 📦' : 'PAGO ✅'}
                        </span>
                    </div>
                    
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <a href="https://wa.me/258${numeroComprador}?text=${msgZap}" target="_blank" style="flex: 1; background: #25D366; color: white; text-align: center; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; text-decoration: none;">💬 Falar com o Comprador</a>
                        ${botaoEnviado}
                    </div>
                </div>
            `;
        });

        listaDiv.innerHTML = html;

    } catch (e) {
        console.error("Erro ao carregar vendas:", e);
    }
}

// ===== MARCAR COMO ENVIADO =====
async function marcarComoEnviado(vendaId) {
    if (!confirm("Confirmas que já entregaste ou enviaste o produto ao cliente?")) return;

    try {
        const sessao = await MZ.sessaoValida();
        const r = await fetch(MZ.url + "/rest/v1/vendas_protegidas?id=eq." + vendaId, {
            method: "PATCH",
            headers: { apikey: MZ.key, Authorization: "Bearer " + sessao.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({ status: "enviado" })
        });

        if (r.ok) {
            alert("✅ Status atualizado! O comprador foi notificado.");
            const sessao2 = await MZ.sessaoValida();
            const userRes = await fetch(MZ.url + "/auth/v1/user", { headers: { apikey: MZ.key, Authorization: "Bearer " + sessao2.access_token } });
            const user = await userRes.json();
            
            // Recarrega as vendas e o saldo
            carregarVendasProtegidasVendedor(user.id); 
            carregarSaldoENotificacoes(user.id);
        } else {
            alert("Erro ao atualizar.");
        }
    } catch (e) {
        alert("Erro de ligação.");
    }
}

// ===== SAIR =====
window.sair = function() {
    if (typeof MZ.limparSessao === "function") MZ.limparSessao();
    localStorage.removeItem("mzlink_sessao");
    window.location.href = "index.html";
};
