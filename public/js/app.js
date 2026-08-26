// Función para alternar visibilidad entre pestañas
function showTab(tabId) {
    const sections = document.querySelectorAll('.tab-content');
    sections.forEach(section => section.classList.remove('active'));

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(button => button.classList.remove('active'));

    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    const activeButton = Array.from(buttons).find(btn => 
        btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)
    );
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Memoria temporal local para Requisitos Técnicos
let requisitos = [];

function guardarRequisito(e) {
    e.preventDefault();
    
    const num = document.getElementById('num-requisito').value.trim();
    const nombre = document.getElementById('nombre-requisito').value.trim();
    const detalle = document.getElementById('detalle-requisito').value.trim();

    const index = requisitos.findIndex(r => r.num === num);
    if (index !== -1) {
        requisitos[index] = { num, nombre, detalle };
    } else {
        requisitos.push({ num, nombre, detalle });
    }

    document.getElementById('form-requisito').reset();
    renderizarTablaRequisitos();
}

function renderizarTablaRequisitos() {
    const tbody = document.getElementById('tabla-requisitos-body');
    tbody.innerHTML = '';

    requisitos.forEach((req) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${req.num}</strong></td>
            <td>${req.nombre}</td>
            <td>${req.detalle}</td>
            <td>
                <button class="btn-danger" onclick="eliminarRequisito('${req.num}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function eliminarRequisito(num) {
    requisitos = requisitos.filter(r => r.num !== num);
    renderizarTablaRequisitos();
}