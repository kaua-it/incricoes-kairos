/* =====================================================
   CONFIGURAÇÕES
===================================================== */

const LUNCH_PRICE = 15.00;
const PIX_KEY = "049.220.014-92";
const PIX_RECIPIENT = "Francivaldo Tomaz de Araujo";

const SUPABASE_URL = "https://vefaxqbazimpvsqncseu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vRkDxbA0gkQ9AKLNF_u7hA_1vEGHMlM";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

let registrations = [];
let editingId = null;


/* =====================================================
   UTILITÁRIOS
===================================================== */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function normalizeChildren(item) {
    if (Array.isArray(item.criancas)) return item.criancas;
    if (Array.isArray(item.childrenData)) return item.childrenData;
    return [];
}

function getAdultLunchCount(item) {
    if (typeof item.almoco === "boolean") {
        return item.almoco ? 1 : 0;
    }

    if (item.lunch === "Sim") {
        return 1;
    }

    return 0;
}

function getChildrenLunchCount(item) {
    return normalizeChildren(item).filter(child => {
        return child.almoco === true || child.lunch === true || child.lunch === "Sim";
    }).length;
}

function getTotalLunchCount(item) {
    return getAdultLunchCount(item) + getChildrenLunchCount(item);
}

function getChildrenCount(item) {
    return normalizeChildren(item).length;
}

function getLunchValue(item) {
    return getTotalLunchCount(item) * LUNCH_PRICE;
}

function mapRegistration(row) {
    return {
        id: row.id,
        name: row.nome || "",
        phone: row.telefone || "",
        email: row.email || "",
        city: row.cidade || "",
        adults: 1,
        lunch: row.almoco ? "Sim" : "Não",
        proteina: row.proteina || "",
        adultLunchCount: row.almoco ? 1 : 0,
        children: getChildrenCount(row) > 0 ? "Sim" : "Não",
        childrenCount: getChildrenCount(row),
        childrenData: normalizeChildren(row),
        childrenLunchCount: getChildrenLunchCount(row),
        totalLunchCount: getTotalLunchCount(row),
        paymentMethod: getTotalLunchCount(row) > 0 ? "PIX" : "",
        notes: row.observacoes || "",
        imagePermission: row.autorizacao_imagem === true,
        createdAt: row.created_at || ""
    };
}


/* =====================================================
   AUTENTICAÇÃO DO ADMINISTRADOR
===================================================== */

async function showAdmin() {
    document.getElementById("loginScreen")?.classList.add("hidden");
    document.getElementById("adminPanel")?.classList.remove("hidden");

    await loadRegistrations();
    render();
    updateStats();
    updatePaymentDisplay();
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

async function checkSession() {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        await showAdmin();
    }
}


document.getElementById("loginForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("username")?.value.trim();
    const password = document.getElementById("password")?.value || "";
    const errorElement = document.getElementById("loginError");

    const button = event.currentTarget.querySelector('button[type="submit"]');

    errorElement?.classList.add("hidden");

    try {
        if (button) {
            button.disabled = true;
            button.textContent = "Entrando...";
        }

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        await showAdmin();
    } catch (error) {
        console.error("Erro no login:", error);
        errorElement?.classList.remove("hidden");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Entrar";
        }
    }
});




/* =====================================================
   BANCO DE DADOS
===================================================== */

async function loadRegistrations() {
    const { data, error } = await supabaseClient
        .from("inscricoes")
        .select("*")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao carregar inscrições:", error);
        alert("Não foi possível carregar as inscrições.");
        registrations = [];
        return;
    }

    registrations = (data || []).map(mapRegistration);
}

async function saveRegistrationToDatabase(data, id = null) {
    const payload = {
        nome: data.name,
        telefone: data.phone,
        email: data.email,
        cidade: data.city,
        almoco: data.lunch === "Sim",
        proteina: data.lunch === "Sim" ? (data.proteina || null) : null,
        criancas: data.childrenData || [],
        observacoes: data.notes || "",
        autorizacao_imagem: data.imagePermission !== false
    };

    if (id) {
        const { error } = await supabaseClient
            .from("inscricoes")
            .update(payload)
            .eq("id", id);

        if (error) throw error;
    } else {
        const { error } = await supabaseClient
            .from("inscricoes")
            .insert([payload]);

        if (error) throw error;
    }
}


/* =====================================================
   ESTATÍSTICAS
===================================================== */

function updateStats() {
    const totalRegistrations = registrations.length;
    const totalAdults = registrations.length;
    const totalChildren = registrations.reduce((sum, item) => {
        return sum + getChildrenCount(item);
    }, 0);
    const totalLunch = registrations.reduce((sum, item) => {
        return sum + getTotalLunchCount(item);
    }, 0);
    const familiesWithChildren = registrations.filter(item => {
        return getChildrenCount(item) > 0;
    }).length;

    const values = {
        totalRegistrations,
        totalAdults,
        totalChildren,
        totalLunch,
        familiesWithChildren
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}


/* =====================================================
   FILTROS
===================================================== */

function applyFilters() {
    const search = document.getElementById("searchInput")?.value
        .toLowerCase()
        .trim() || "";

    const lunchFilter = document.getElementById("lunchFilter")?.value || "all";
    const childrenFilter = document.getElementById("childrenFilter")?.value || "all";

    return registrations
        .filter(item => {
            const matchesSearch =
                item.name.toLowerCase().includes(search) ||
                item.phone.toLowerCase().includes(search) ||
                item.city.toLowerCase().includes(search);

            const hasLunch = getTotalLunchCount(item) > 0;
            const hasChildren = getChildrenCount(item) > 0;

            const matchesLunch =
                lunchFilter === "all" ||
                (lunchFilter === "Sim" && hasLunch) ||
                (lunchFilter === "Não" && !hasLunch);

            const matchesChildren =
                childrenFilter === "all" ||
                (childrenFilter === "Sim" && hasChildren) ||
                (childrenFilter === "Não" && !hasChildren);

            return matchesSearch && matchesLunch && matchesChildren;
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}


document.getElementById("searchInput")?.addEventListener("input", render);
document.getElementById("lunchFilter")?.addEventListener("change", render);
document.getElementById("childrenFilter")?.addEventListener("change", render);


/* =====================================================
   TABELA
===================================================== */

function render() {
    const tbody = document.getElementById("registrationsTable");
    const emptyState = document.getElementById("emptyState");
    const resultCount = document.getElementById("resultCount");

    if (!tbody) return;

    const filtered = applyFilters();
    tbody.innerHTML = "";

    if (resultCount) {
        resultCount.textContent = `${filtered.length} participante(s)`;
    }

    emptyState?.classList.toggle("hidden", filtered.length !== 0);

    filtered.forEach(item => {
        const tr = document.createElement("tr");
        const children = normalizeChildren(item);
        const totalLunch = getTotalLunchCount(item);
        const lunchValue = getLunchValue(item);

        const childrenDetails = children.length
            ? children.map(child => `
                <div class="child-detail">
                    <strong>${escapeHTML(child.nome ?? child.name ?? "")}</strong>
                    <span>${escapeHTML(child.idade ?? child.age ?? "-")} anos</span>
                    <small>${
                        (child.almoco === true || child.lunch === true || child.lunch === "Sim")
                            ? `🍽️ Almoço — ${escapeHTML(child.proteina || "Proteína não informada")}`
                            : "Sem almoço"
                    }</small>
                </div>
            `).join("")
            : "-";

        tr.innerHTML = `
            <td><strong>${escapeHTML(item.name)}</strong></td>
            <td>${escapeHTML(item.phone || "-")}</td>
            <td>${escapeHTML(item.email || "-")}</td>
            <td>${escapeHTML(item.city || "-")}</td>
            <td>1</td>
            <td>
                ${totalLunch > 0
                    ? `<strong>🍽️ ${totalLunch}</strong><br><small>${getAdultLunchCount(item)} adulto(s)${getChildrenLunchCount(item) ? ` + ${getChildrenLunchCount(item)} criança(s)` : ""}</small>`
                    : "Não"}
            </td>
            <td>${item.lunch === "Sim" ? escapeHTML(item.proteina || "Não informada") : "-"}</td>
            <td>${totalLunch > 0 ? "📱 PIX" : "-"}</td>
            <td>${totalLunch > 0 ? formatCurrency(lunchValue) : "R$ 0,00"}</td>
            <td>${children.length ? "👶 Sim" : "Não"}</td>
            <td>${children.length}</td>
            <td>${childrenDetails}<br>${escapeHTML(item.notes || "-")}</td>
            <td>
                <button type="button" class="btn small" onclick="openEditModal(${Number(item.id)})">✏️</button>
                <button type="button" class="btn small danger" onclick="deleteRegistration(${Number(item.id)})">🗑️</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}


/* =====================================================
   MODAL ADMIN
===================================================== */

function openAddModal() {
    editingId = null;
    document.getElementById("modalTitle").textContent = "Adicionar inscrição";
    document.getElementById("editId").value = "";
    document.getElementById("adminRegistrationForm")?.reset();

    const childrenNo = document.querySelector('input[name="adminChildren"][value="Não"]');
    if (childrenNo) childrenNo.checked = true;

    const lunchYes = document.querySelector('input[name="adminLunch"][value="Sim"]');
    if (lunchYes) lunchYes.checked = true;

    const adminProtein = document.getElementById("adminProtein");
    if (adminProtein) adminProtein.value = "";

    document.getElementById("adminChildrenCount").value = 0;
    document.getElementById("adminChildrenFields").innerHTML = "";
    document.getElementById("registrationModal")?.classList.remove("hidden");
    updatePaymentDisplay();
}

function openEditModal(id) {
    const item = registrations.find(reg => Number(reg.id) === Number(id));
    if (!item) return;

    editingId = item.id;
    document.getElementById("modalTitle").textContent = "Editar inscrição";
    document.getElementById("editId").value = item.id;

    document.getElementById("adminName").value = item.name;
    document.getElementById("adminPhone").value = item.phone;
    document.getElementById("adminEmail").value = item.email;
    document.getElementById("adminCity").value = item.city;

    document.querySelectorAll('input[name="adminLunch"]').forEach(input => {
        input.checked = input.value === item.lunch;
    });

    const adminProtein = document.getElementById("adminProtein");
    if (adminProtein) adminProtein.value = item.proteina || "";

    document.querySelectorAll('input[name="adminChildren"]').forEach(input => {
        input.checked = input.value === item.children;
    });

    document.getElementById("adminChildrenCount").value = item.childrenCount;
    generateAdminChildrenFields(item.childrenData);
    document.getElementById("adminNotes").value = item.notes || "";

    document.getElementById("registrationModal")?.classList.remove("hidden");
    updatePaymentDisplay();
}

function closeRegistrationModal() {
    document.getElementById("registrationModal")?.classList.add("hidden");
    editingId = null;
}

function generateAdminChildrenFields(existingChildren = []) {
    const count = Number(document.getElementById("adminChildrenCount")?.value) || 0;
    const container = document.getElementById("adminChildrenFields");
    if (!container) return;

    container.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const child = existingChildren[i] || {};
        const name = child.nome ?? child.name ?? "";
        const age = child.idade ?? child.age ?? "";
        const lunch = child.almoco === true || child.lunch === true || child.lunch === "Sim";
        const protein = child.proteina || "";

        const wrapper = document.createElement("div");
        wrapper.className = "child-card";
        wrapper.innerHTML = `
            <div class="child-header"><span class="child-number">Criança ${i + 1}</span></div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" class="admin-child-name" value="${escapeHTML(name)}" required>
                </div>
                <div class="form-group">
                    <label>Idade</label>
                    <input type="number" class="admin-child-age" min="0" max="17" value="${escapeHTML(age)}" required>
                </div>
            </div>
            <label class="child-lunch-option">
                <input type="checkbox" class="admin-child-lunch" ${lunch ? "checked" : ""}>
                <span>🍽️ Esta criança irá querer almoço</span>
            </label>

            <div class="form-group admin-child-protein-group ${lunch ? "" : "hidden"}">
                <label>🥩 Qual proteína?</label>
                <select class="admin-child-protein" ${lunch ? "required" : ""}>
                    <option value="">Selecione a proteína</option>
                    <option value="Carne" ${protein === "Carne" ? "selected" : ""}>🥩 Carne</option>
                    <option value="Frango" ${protein === "Frango" ? "selected" : ""}>🍗 Frango</option>
                    <option value="Peixe" ${protein === "Peixe" ? "selected" : ""}>🐟 Peixe</option>
                </select>
            </div>
        `;

        container.appendChild(wrapper);
    }

    updatePaymentDisplay();
}


document.getElementById("adminChildrenCount")?.addEventListener("input", () => {
    const count = Number(document.getElementById("adminChildrenCount")?.value) || 0;
    generateAdminChildrenFields(Array.from({ length: count }, () => ({})));
});

document.getElementById("adminChildrenFields")?.addEventListener("change", event => {
    if (event.target.classList.contains("admin-child-lunch")) {
        const wrapper = event.target.closest(".child-card");
        const proteinGroup = wrapper?.querySelector(".admin-child-protein-group");
        const proteinSelect = wrapper?.querySelector(".admin-child-protein");

        if (event.target.checked) {
            proteinGroup?.classList.remove("hidden");
            if (proteinSelect) proteinSelect.required = true;
        } else {
            proteinGroup?.classList.add("hidden");
            if (proteinSelect) {
                proteinSelect.required = false;
                proteinSelect.value = "";
            }
        }

        updatePaymentDisplay();
    }
});


document.querySelectorAll('input[name="adminLunch"]').forEach(input => {
    input.addEventListener("change", () => {
        updateAdminProteinVisibility();
        updatePaymentDisplay();
    });
});


document.querySelectorAll('input[name="adminChildren"]').forEach(input => {
    input.addEventListener("change", function () {
        const isYes = this.value === "Sim" && this.checked;
        const countInput = document.getElementById("adminChildrenCount");

        if (!isYes) {
            if (countInput) countInput.value = 0;
            generateAdminChildrenFields([]);
        } else if (Number(countInput?.value) === 0) {
            if (countInput) countInput.value = 1;
            generateAdminChildrenFields([]);
        }
    });
});

function updateAdminProteinVisibility() {
    const lunch = document.querySelector('input[name="adminLunch"]:checked')?.value;
    const section = document.getElementById("adminProteinSection");
    const select = document.getElementById("adminProtein");

    if (!section || !select) return;

    if (lunch === "Sim") {
        section.classList.remove("hidden");
        select.required = true;
    } else {
        section.classList.add("hidden");
        select.required = false;
        select.value = "";
    }
}


function updatePaymentDisplay() {
    const adultLunch = document.querySelector('input[name="adminLunch"]:checked')?.value === "Sim" ? 1 : 0;
    const childLunch = Array.from(document.querySelectorAll(".admin-child-lunch"))
        .filter(input => input.checked).length;
    const total = adultLunch + childLunch;
    const value = total * LUNCH_PRICE;

    const valueInput = document.getElementById("adminPaymentValue");
    if (valueInput) valueInput.value = formatCurrency(value);

    const pixInfo = document.getElementById("adminPixInfo");
    if (pixInfo) pixInfo.classList.toggle("hidden", total === 0);

    const pixKey = document.getElementById("adminPixKey");
    const pixRecipient = document.getElementById("adminPixRecipient");
    if (pixKey) pixKey.textContent = PIX_KEY;
    if (pixRecipient) pixRecipient.textContent = PIX_RECIPIENT;

    updateAdminProteinVisibility();
}


/* =====================================================
   SALVAR / EDITAR
===================================================== */

document.getElementById("adminRegistrationForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) return;

    const childrenChoice = document.querySelector('input[name="adminChildren"]:checked')?.value || "Não";
    const childrenData = [];

    if (childrenChoice === "Sim") {
        const names = document.querySelectorAll(".admin-child-name");
        const ages = document.querySelectorAll(".admin-child-age");
        const lunches = document.querySelectorAll(".admin-child-lunch");
        const proteins = document.querySelectorAll(".admin-child-protein");

        names.forEach((input, index) => {
            childrenData.push({
                nome: input.value.trim(),
                idade: Number(ages[index]?.value || 0),
                almoco: Boolean(lunches[index]?.checked),
                proteina: lunches[index]?.checked
                    ? (proteins[index]?.value || null)
                    : null
            });
        });
    }

    const data = {
        name: document.getElementById("adminName").value.trim(),
        phone: document.getElementById("adminPhone").value.trim(),
        email: document.getElementById("adminEmail").value.trim(),
        city: document.getElementById("adminCity").value.trim(),
        lunch: document.querySelector('input[name="adminLunch"]:checked')?.value || "Não",
        proteina: document.getElementById("adminProtein")?.value || null,
        children: childrenChoice,
        childrenData,
        notes: document.getElementById("adminNotes").value.trim(),
        imagePermission: true
    };

    const button = event.currentTarget.querySelector('button[type="submit"]');
    const originalText = button?.textContent;

    try {
        if (button) {
            button.disabled = true;
            button.textContent = "Salvando...";
        }

        await saveRegistrationToDatabase(data, editingId);
        await loadRegistrations();
        render();
        updateStats();
        closeRegistrationModal();
    } catch (error) {
        console.error("Erro ao salvar inscrição:", error);
        alert("Não foi possível salvar a inscrição.");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalText || "✓ Salvar inscrição";
        }
    }
});


/* =====================================================
   EXCLUIR
===================================================== */

async function deleteRegistration(id) {
    const item = registrations.find(reg => Number(reg.id) === Number(id));
    if (!item) return;

    if (!confirm(`Deseja realmente excluir a inscrição de "${item.name}"?`)) return;

    const { error } = await supabaseClient
        .from("inscricoes")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Erro ao excluir:", error);
        alert("Não foi possível excluir a inscrição.");
        return;
    }

    await loadRegistrations();
    render();
    updateStats();
}


/* =====================================================
   IMPRESSÃO / CREDENCIAMENTO
===================================================== */

function printCredenciamento() {
    const list = [...registrations].sort((a, b) => {
        return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    });

    if (!list.length) {
        alert("Não existem inscrições para imprimir.");
        return;
    }

    const totalAdults = list.length;
    const totalChildren = list.reduce((sum, item) => sum + getChildrenCount(item), 0);
    const withLunch = list.filter(item => getTotalLunchCount(item) > 0).length;
    const withoutLunch = list.length - withLunch;

    const rows = list.map((item, index) => {
        const children = normalizeChildren(item);
        const childrenText = children.length
            ? children.map(child => {
                const name = child.nome ?? child.name ?? "";
                const age = child.idade ?? child.age ?? "-";
                const protein = child.proteina || "Proteína não informada";
                return `${escapeHTML(name)} (${escapeHTML(age)} anos) — ${escapeHTML(protein)}`;
            }).join("<br>")
            : "—";

        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHTML(item.name)}</strong></td>
                <td>${escapeHTML(item.phone || "—")}</td>
                <td>${escapeHTML(item.city || "—")}</td>
                <td>${item.lunch === "Sim" ? `SIM — ${escapeHTML(item.proteina || "Proteína não informada")}` : "NÃO"}</td>
                <td>${childrenText}</td>
                <td>${escapeHTML(item.notes || "—")}</td>
                <td class="presence">☐</td>
            </tr>
        `;
    }).join("");

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
        alert("Permita pop-ups no navegador para imprimir a lista.");
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Lista de credenciamento — II Kairós</title>
<style>
    @page {
    size: A4 landscape;
    margin: 8mm;
}
    * { box-sizing: border-box; }
    body {
    font-family: Arial, sans-serif;
    font-size: 11px;
    color: #111;
}
    .header { border-bottom: 2px solid #9b7a3c; padding-bottom: 6px; margin-bottom: 7px; }
    .header h1 {
    font-size: 20px;
    margin: 0 0 2px;
}
    .header p { margin: 2px 0; font-size: 9px; }
    .header .date { font-weight: bold; }
    .summary { display: flex; gap: 14px; margin-bottom: 7px; font-size: 9px; }
    .summary strong { font-size: 10px; }
    table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}
    th, td {
    border: 1px solid #999;
    padding: 6px 5px;
    font-size: 10px;
    vertical-align: middle;
}
    th { background: #eee; font-size: 9px; text-transform: uppercase; }
    td { font-size: 8.5px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th:nth-child(1), td:nth-child(1) { width: 4%; text-align: center; }
    th:nth-child(2), td:nth-child(2) { width: 18%; }
    th:nth-child(3), td:nth-child(3) { width: 13%; }
    th:nth-child(4), td:nth-child(4) { width: 11%; }
    th:nth-child(5), td:nth-child(5) { width: 7%; text-align: center; }
    th:nth-child(6), td:nth-child(6) { width: 19%; }
    th:nth-child(7), td:nth-child(7) { width: 20%; }
    th:nth-child(8), td:nth-child(8) { width: 8%; text-align: center; }
    .presence { font-size: 15px; }
    .footer { margin-top: 5px; font-size: 7px; text-align: right; }
</style>
</head>
<body>
    <div class="header">
        <h1>II Kairós de Cura e Libertação</h1>
        <p><strong>Corações curados, vidas libertadas pelo poder do Espírito Santo.</strong></p>
        <p class="date">19 e 20 de setembro — Colégio Fonte do Saber (Antigo ECAC)</p>
    </div>

    <div class="summary">
        <span>Inscritos: <strong>${totalAdults}</strong></span>
        <span>Adultos: <strong>${totalAdults}</strong></span>
        <span>Crianças: <strong>${totalChildren}</strong></span>
        <span>Com almoço: <strong>${withLunch}</strong></span>
        <span>Sem almoço: <strong>${withoutLunch}</strong></span>
    </div>

    <table>
        <thead>
            <tr>
                <th>Nº</th>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Cidade</th>
                <th>Almoço / proteína</th>
                <th>Crianças (nome/idade/proteína)</th>
                <th>Observações</th>
                <th>Presente</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>

    <div class="footer">Lista de credenciamento — II Kairós de Cura e Libertação</div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
    };
}


document.getElementById("printBtn")?.addEventListener("click", printCredenciamento);


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

checkSession();
