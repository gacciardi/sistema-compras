async function cambiarColorBg(color, guardar = true) {
    document.documentElement.style.setProperty('--bg-primary', color);
    document.body.style.backgroundColor = color;

    const inputColor = document.getElementById('master-bg-color');
    if (inputColor && inputColor.value !== color) {
        inputColor.value = color;
    }

    if (guardar) {
        await fetch('/api/configuraciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave: 'sys_bg_color', valor: color })
        });
    }
}

function subirLogoDesdePC(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Image = e.target.result;
            cambiarLogo(base64Image, true);
        };
        reader.readAsDataURL(file);
    }
}

async function cambiarLogo(srcImagen, guardar = true) {
    if (!srcImagen) return;

    const logoImg = document.getElementById('app-logo');
    const loginLogo = document.getElementById('login-logo');

    if (logoImg) {
        logoImg.src = srcImagen;
        logoImg.style.display = 'block';
    }
    if (loginLogo) {
        loginLogo.src = srcImagen;
        loginLogo.style.display = 'inline-block';
    }

    if (guardar) {
        try {
            const res = await fetch('/api/configuraciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clave: 'sys_logo', valor: srcImagen })
            });

            if (res.ok) {
                alert("✅ Logo actualizado y guardado correctamente en la base de datos.");
            } else {
                alert("❌ Ocurrió un error al guardar el logo en el servidor.");
            }
        } catch (err) {
            console.error("Error al guardar logo:", err);
            alert("❌ Error de conexión al guardar el logo.");
        }
    }
}
