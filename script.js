/* =====================================================
   CONFIGURAÇÕES
===================================================== */

const LUNCH_PRICE = 15.00;

const PIX_KEY = "049.220.014-92";
const PIX_NAME = "Francivaldo Tomaz de Araujo";

const SUPABASE_URL = "https://vefaxqbazimpvsqncseu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vRkDxbA0gkQ9AKLNF_u7hA_1vEGHMlM";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* =====================================================
   PIX
===================================================== */

const pixKeyElement = document.getElementById("pixKey");
const pixNameElement = document.getElementById("pixName");

if (pixKeyElement) pixKeyElement.textContent = PIX_KEY;
if (pixNameElement) pixNameElement.textContent = PIX_NAME;


/* =====================================================
   CRIANÇAS
===================================================== */

function generateChildrenFields() {
    const count = Number(document.getElementById("childrenCount")?.value) || 0;
    const container = document.getElementById("childrenFields");

    if (!container) return;

    container.innerHTML = "";

    for (let i = 1; i <= count; i++) {
        const wrapper = document.createElement("div");
        wrapper.className = "child-card";

        wrapper.innerHTML = `
            <div class="child-header">
                <span class="child-number">Criança ${i}</span>
            </div>

            <div class="form-grid">
                <div class="form-group">
                    <label for="childName${i}">Nome da criança ${i}</label>
                    <input
                        type="text"
                        id="childName${i}"
                        class="child-name"
                        placeholder="Nome da criança"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="childAge${i}">Idade</label>
                    <input
                        type="number"
                        id="childAge${i}"
                        class="child-age"
                        min="0"
                        max="17"
                        placeholder="Idade"
                        required
                    >
                </div>
            </div>

            <label class="child-lunch-option">
                <input type="checkbox" class="child-lunch">
                <span>🍽️ Esta criança irá querer almoço</span>
            </label>

            <div class="form-group child-protein-group hidden">
                <label>🥩 Qual proteína?</label>

                <select class="child-protein">
                    <option value="">Selecione a proteína</option>
                    <option value="Carne">🥩 Carne</option>
                    <option value="Frango">🍗 Frango</option>
                    <option value="Peixe">🐟 Peixe</option>
                </select>
            </div>
        `;

        container.appendChild(wrapper);

        const lunchCheckbox = wrapper.querySelector(".child-lunch");
        const proteinGroup = wrapper.querySelector(".child-protein-group");
        const proteinSelect = wrapper.querySelector(".child-protein");

        lunchCheckbox?.addEventListener("change", () => {
            if (lunchCheckbox.checked) {
                proteinGroup?.classList.remove("hidden");
                if (proteinSelect) proteinSelect.required = true;
            } else {
                proteinGroup?.classList.add("hidden");
                if (proteinSelect) {
                    proteinSelect.required = false;
                    proteinSelect.value = "";
                }
            }

            updatePaymentSection();
        });
    }

    updatePaymentSection();
}


document
    .querySelectorAll('input[name="children"]')
    .forEach(radio => {
        radio.addEventListener("change", function () {
            const section = document.getElementById("childrenSection");
            const fields = document.getElementById("childrenFields");

            if (this.value === "Sim") {
                section?.classList.remove("hidden");
                generateChildrenFields();
            } else {
                section?.classList.add("hidden");
                if (fields) fields.innerHTML = "";
                updatePaymentSection();
            }
        });
    });


document
    .getElementById("childrenCount")
    ?.addEventListener("input", generateChildrenFields);


/* =====================================================
   ALMOÇO / PAGAMENTO
===================================================== */

function getChildrenLunchCountFromForm() {
    return Array.from(
        document.querySelectorAll(".child-lunch")
    ).filter(checkbox => checkbox.checked).length;
}

function updateAdultProteinVisibility() {
    const lunch = document.querySelector('input[name="lunch"]:checked')?.value;
    const section = document.getElementById("adultProteinSection");
    const select = document.getElementById("adultProtein");

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


function updatePaymentSection() {
    const lunch = document.querySelector('input[name="lunch"]:checked')?.value;
    const children = document.querySelector('input[name="children"]:checked')?.value;

    // Cada inscrição representa exatamente 1 adulto.
    const adultLunchCount = lunch === "Sim" ? 1 : 0;
    const childrenLunchCount = children === "Sim"
        ? getChildrenLunchCountFromForm()
        : 0;

    const totalLunchCount = adultLunchCount + childrenLunchCount;

    const paymentSection = document.getElementById("paymentSection");
    const lunchQuantity = document.getElementById("lunchQuantity");
    const lunchTotal = document.getElementById("lunchTotal");

    if (totalLunchCount > 0) {
        paymentSection?.classList.remove("hidden");
        if (lunchQuantity) lunchQuantity.textContent = totalLunchCount;
        if (lunchTotal) {
            lunchTotal.textContent = `R$ ${(totalLunchCount * LUNCH_PRICE)
                .toFixed(2)
                .replace(".", ",")}`;
        }

        document
            .querySelectorAll('input[name="paymentMethod"]')
            .forEach(input => input.required = true);
    } else {
        paymentSection?.classList.add("hidden");
        if (lunchQuantity) lunchQuantity.textContent = "0";
        if (lunchTotal) lunchTotal.textContent = "R$ 0,00";

        document
            .querySelectorAll('input[name="paymentMethod"]')
            .forEach(input => {
                input.required = false;
                input.checked = false;
            });

        document.getElementById("pixInfo")?.classList.add("hidden");
    }
}


document
    .querySelectorAll('input[name="lunch"]')
    .forEach(input => {
        input.addEventListener("change", () => {
            updateAdultProteinVisibility();
            updatePaymentSection();
        });
    });

updateAdultProteinVisibility();


document
    .querySelectorAll('input[name="paymentMethod"]')
    .forEach(input => {
        input.addEventListener("change", function () {
            const pixInfo = document.getElementById("pixInfo");
            if (this.value === "PIX") {
                pixInfo?.classList.remove("hidden");
            } else {
                pixInfo?.classList.add("hidden");
            }
        });
    });


/* =====================================================
   ENVIO DA INSCRIÇÃO
===================================================== */

document
    .getElementById("registrationForm")
    ?.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!this.reportValidity()) return;

        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton?.textContent;

        const lunch = document.querySelector('input[name="lunch"]:checked')?.value;
        const childrenChoice = document.querySelector('input[name="children"]:checked')?.value;

        const childrenData = [];

        if (childrenChoice === "Sim") {
            const names = document.querySelectorAll(".child-name");
            const ages = document.querySelectorAll(".child-age");
            const lunches = document.querySelectorAll(".child-lunch");

            names.forEach((name, index) => {
                childrenData.push({
                    nome: name.value.trim(),
                    idade: Number(ages[index]?.value || 0),
                    almoco: Boolean(lunches[index]?.checked),
                    proteina: lunches[index]?.checked
                        ? (document.querySelectorAll(".child-protein")[index]?.value || null)
                        : null
                });
            });
        }

        const adultProtein =
            lunch === "Sim"
                ? document.getElementById("adultProtein")?.value || null
                : null;

        if (lunch === "Sim" && !adultProtein) {
            alert("Selecione a proteína do almoço.");
            document.getElementById("adultProtein")?.focus();
            return;
        }

        const childrenWithLunch = childrenData.filter(child => child.almoco);

        if (childrenWithLunch.some(child => !child.proteina)) {
            alert("Selecione a proteína do almoço para cada criança que irá almoçar.");
            return;
        }

        const totalLunchCount =
            (lunch === "Sim" ? 1 : 0) +
            childrenData.filter(child => child.almoco).length;

        const paymentMethod = totalLunchCount > 0
            ? document.querySelector('input[name="paymentMethod"]:checked')?.value
            : null;

        if (totalLunchCount > 0 && paymentMethod !== "PIX") {
            alert("Selecione o pagamento via PIX para continuar.");
            return;
        }

        const registration = {
            nome: document.getElementById("name")?.value.trim() || "",
            telefone: document.getElementById("phone")?.value.trim() || "",
            email: document.getElementById("email")?.value.trim() || "",
            cidade: document.getElementById("city")?.value.trim() || "",
            almoco: lunch === "Sim",
            proteina: adultProtein,
            criancas: childrenData,
            observacoes: document.getElementById("notes")?.value.trim() || "",
            autorizacao_imagem: document.getElementById("imagePermission")?.checked === true
        };

        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Enviando inscrição...";
            }

            const { error } = await supabaseClient
                .from("inscricoes")
                .insert([registration]);

            if (error) throw error;

            this.reset();

            const childrenSection = document.getElementById("childrenSection");
            const childrenFields = document.getElementById("childrenFields");
            const childrenCount = document.getElementById("childrenCount");

            childrenSection?.classList.add("hidden");
            if (childrenFields) childrenFields.innerHTML = "";
            if (childrenCount) childrenCount.value = 1;

            const adultProteinSelect = document.getElementById("adultProtein");
            const adultProteinSection = document.getElementById("adultProteinSection");

            if (adultProteinSelect) {
                adultProteinSelect.value = "";
                adultProteinSelect.required = false;
            }

            adultProteinSection?.classList.add("hidden");

            document.getElementById("paymentSection")?.classList.add("hidden");
            document.getElementById("pixInfo")?.classList.add("hidden");
            document.getElementById("lunchQuantity").textContent = "0";
            document.getElementById("lunchTotal").textContent = "R$ 0,00";

            document.getElementById("successModal")?.classList.remove("hidden");
        } catch (error) {
            console.error("Erro ao salvar inscrição:", error);
            alert(
                "Não foi possível enviar sua inscrição agora. " +
                "Verifique sua conexão e tente novamente."
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalText || "Confirmar inscrição";
            }
        }
    });


/* =====================================================
   COPIAR PIX
===================================================== */

function copyPixKey() {
    const button = document.getElementById("copyPixButton");

    navigator.clipboard
        .writeText(PIX_KEY)
        .then(() => {
            if (button) {
                button.textContent = "✓ Chave copiada!";
                setTimeout(() => {
                    button.textContent = "📋 Copiar chave";
                }, 2000);
            }
        })
        .catch(() => {
            alert("Não foi possível copiar a chave PIX.");
        });
}


/* =====================================================
   MODAL
===================================================== */

function closeModal() {
    document.getElementById("successModal")?.classList.add("hidden");
}


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

updatePaymentSection();
