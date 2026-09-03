// RENDRERIZADO DE MATRIZ DE PERMISOS DE PESTAÑAS
function renderizarMatrizPermisos() {
    const container = document.getElementById('matriz-permisos-container');
    if (!container) return;

    const pestañas = [
        { id: 1, nombre: 'P1: Requisitos' },
        { id: 2, nombre: 'P2: Proveedores' },
        { id: 3, nombre: 'P3: Evaluación' },
        { id: 4, nombre: 'P4: Órdenes Compra' },
        { id: 5, nombre: 'P5: Recepción' },
        { id: 6, nombre: 'P6: Usuarios' }
    ];

    let html = '<table><thead><tr><th>Sector</th>';
    pestañas.forEach(p => { html += `<th style="text-align:center;">${p.nombre}</th>`; });
    html += '</tr></thead><tbody>';

    listaSectoresGlobal.forEach(sec => {
        html += `<tr><td><strong>${sec}</strong></td>`;
        const permitidas = permisosPorSector[sec] || [];

        pestañas.forEach(p => {
            const checked = permitidas.includes(p.id) ? 'checked' : '';
            // Se aseguran comillas para proteger sectores con espacios o barras '/'
            html += `<td style="text-align:center;"><input type="checkbox" data-sector="${sec}" data-pestaña="${p.id}" ${checked}></td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// GUARDAR PERMISOS DE SECTORES EN BASE DE DATOS POSTGRESQL
async function guardarPermisosSectores() {
    const checkboxes = document.querySelectorAll('#matriz-permisos-container input[type="checkbox"]');
    const nuevosPermisos = {};

    // Inicializar array vacio para cada sector existente
    listaSectoresGlobal.forEach(s => { nuevosPermisos[s] = []; });

    checkboxes.forEach(chk => {
        // Usar la API dataset directamente para mayor compatibilidad
        const sec = chk.dataset.sector || chk.getAttribute('data-sector');
        const pId = parseInt(chk.dataset.pestaña || chk.getAttribute('data-pestaña'));

        if (chk.checked && sec && !isNaN(pId)) {
            if (!nuevosPermisos[sec]) {
                nuevosPermisos[sec] = [];
            }
            if (!nuevosPermisos[sec].includes(pId)) {
                nuevosPermisos[sec].push(pId);
            }
        }
    });

    permisosPorSector = nuevosPermisos;

    try {
        const res = await fetch('/api/configuraciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave: 'permisos_sectores', valor: permisosPorSector })
        });

        if (res.ok) {
            alert("✅ Matriz de permisos actualizada correctamente en la Base de Datos.");
            
            // Re-aplicar permisos al usuario actualmente logueado para reflejar los cambios en pantalla
            if (usuarioActual) {
                aplicarPermisosUsuario(usuarioActual.sector);
            }
        } else {
            alert("❌ Error al guardar los permisos en la base de datos.");
        }
    } catch (e) {
        console.error("Error al guardar permisos:", e);
        alert("❌ Error de conexión al guardar los permisos.");
    }
}
