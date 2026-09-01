// 1. DESPLEGABLE DE PROVEEDORES (Pestaña 3, 4 y Gráficos)
function actualizarSelectProveedoresEstadisticas() {
    const select = document.getElementById('select-prov-estadistica');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione un Proveedor (Presione una letra para buscar) --</option>';

    // Ordenar alfabéticamente por nombre de proveedor
    const provsOrdenados = [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre));

    provsOrdenados.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.num;
        opt.innerText = `${p.nombre} (${p.num})`; // Formato ideal para búsqueda alfabética por Nombre
        select.appendChild(opt);
    });

    cargarNombresCriteriosEstadisticas();
    renderizarTablaEstadisticas();
}

// 2. DESPLEGABLES DE COMPRAS (Pestaña 4: Proveedor, Requisito, Condición de Pago)
function actualizarSelectsCompras() {
    const selectProv = document.getElementById('select-compra-prov');
    if (selectProv) {
        selectProv.innerHTML = '<option value="">-- Seleccione Proveedor (Escriba para buscar) --</option>';

        let proveedoresPermitidos = proveedores;

        if (usuarioActual && usuarioActual.nombre !== 'admin') {
            const provsAsignados = permisosProveedoresPorUsuario[usuarioActual.nombre];
            if (Array.isArray(provsAsignados) && provsAsignados.length > 0) {
                proveedoresPermitidos = proveedores.filter(p => provsAsignados.includes(p.num));
            }
        }

        // Ordenar alfabéticamente por nombre
        proveedoresPermitidos.sort((a, b) => a.nombre.localeCompare(b.nombre));

        proveedoresPermitidos.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.num;
            opt.innerText = `${p.nombre} (${p.num})`;
            selectProv.appendChild(opt);
        });
    }

    const selectReq = document.getElementById('select-compra-req');
    if (selectReq) {
        selectReq.innerHTML = '<option value="">-- Seleccione Requisito (Escriba para buscar) --</option>';
        
        // Ordenar alfabéticamente por nombre de requisito/insumo
        const reqsOrdenados = [...requisitos].sort((a, b) => a.nombre.localeCompare(b.nombre));

        reqsOrdenados.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.num;
            opt.innerText = `${r.nombre} [${r.num}]`;
            selectReq.appendChild(opt);
        });
    }

    const selectCondPago = document.getElementById('select-compra-condicion-pago');
    if (selectCondPago) {
        selectCondPago.innerHTML = '<option value="">-- Seleccione Condición --</option>';
        
        const opcionesOrdenadas = [...opcionesCondicionPago].sort((a, b) => a.localeCompare(b));
        
        opcionesOrdenadas.forEach(optVal => {
            const opt = document.createElement('option');
            opt.value = optVal;
            opt.innerText = optVal;
            selectCondPago.appendChild(opt);
        });
    }

    renderizarReglasPagoUI();
}

// 3. DESPLEGABLE DE ÓRDENES PENDIENTES (Pestaña 5: Recepción)
function actualizarSelectOrdenesPendientes() {
    const select = document.getElementById('select-recepcion-orden');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione Orden Pendiente --</option>';

    const pendientes = ordenesCompra.filter(oc => oc.estado === 'Pendiente');
    
    // Ordenar alfabéticamente por nombre del proveedor
    pendientes.sort((a, b) => a.provNombre.localeCompare(b.provNombre));

    pendientes.forEach(oc => {
        const opt = document.createElement('option');
        opt.value = oc.idOrden;
        opt.innerText = `${oc.provNombre} - ${oc.reqNombre} (${oc.idOrden})`;
        select.appendChild(opt);
    });
}

// 4. DESPLEGABLES DE SECTORES Y USUARIOS (Pestaña 6 y Panel Master)
function actualizarSelectSectoresUsuarios() {
    const selects = [
        document.getElementById('usr-sector'),
        document.getElementById('master-usr-sector')
    ];

    const sectoresOrdenados = [...listaSectoresGlobal].sort((a, b) => a.localeCompare(b));

    selects.forEach(select => {
        if (!select) return;
        const valActual = select.value;
        select.innerHTML = '<option value="">-- Seleccione Sector --</option>';
        sectoresOrdenados.forEach(sec => {
            const opt = document.createElement('option');
            opt.value = sec;
            opt.innerText = sec;
            select.appendChild(opt);
        });
        if (valActual && listaSectoresGlobal.includes(valActual)) {
            select.value = valActual;
        }
    });
}
