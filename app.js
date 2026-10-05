const API_URL = "http://localhost:3000/api";

let productos = [];
let carrito = [];

const productsContainer = document.getElementById("productsContainer");
const cartContainer = document.getElementById("cartContainer");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const productCount = document.getElementById("productCount");
const btnComprar = document.getElementById("btnComprar");

const paymentModal = document.getElementById("paymentModal");
const salesModal = document.getElementById("salesModal");
const successModal = document.getElementById("successModal");

function formatoPrecio(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(valor);
}

async function cargarProductos() {
  try {
    const response = await fetch(`${API_URL}/productos`);

    if (!response.ok) {
      throw new Error("No se pudieron cargar los productos.");
    }

    productos = await response.json();
    renderProductos();
  } catch (error) {
    console.error(error);
    productsContainer.innerHTML = `
      <p>No se pudo conectar con el servidor.</p>
      <p>Verificá que Express esté ejecutándose en el puerto 3000.</p>
    `;
  }
}

function renderProductos() {
  productsContainer.innerHTML = "";
  productCount.textContent = `${productos.length} productos`;

  productos.forEach(producto => {
    const agotado = producto.stock === 0;
    const stockBajo = producto.stock > 0 && producto.stock <= 5;

    const card = document.createElement("article");
    card.className = "product-card";

    card.innerHTML = `
      <img class="product-image" src="${producto.imagen}" alt="${producto.nombre}">
      <div class="product-info">
        <h3>${producto.nombre}</h3>
        <div class="price">${formatoPrecio(producto.precio)}</div>
        <span class="stock ${stockBajo ? "low" : ""}">
          ${agotado ? "Sin stock" : `Stock: ${producto.stock}`}
        </span>
        <button class="add-btn" data-id="${producto.id}" ${agotado ? "disabled" : ""}>
          ${agotado ? "Agotado" : "Agregar al carrito"}
        </button>
      </div>
    `;

    productsContainer.appendChild(card);
  });
}

function obtenerCantidadCarrito() {
  return carrito.reduce((total, item) => total + item.cantidad, 0);
}

function obtenerTotalCarrito() {
  return carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);
}

function renderCarrito() {
  cartContainer.innerHTML = "";

  if (carrito.length === 0) {
    cartContainer.innerHTML = `<p class="empty">El carrito está vacío.</p>`;
  } else {
    carrito.forEach(item => {
      const row = document.createElement("div");
      row.className = "cart-item";

      row.innerHTML = `
        <img src="${item.imagen}" alt="${item.nombre}">
        <div>
          <h4>${item.nombre}</h4>
          <p>${formatoPrecio(item.precio)}</p>
          <div class="quantity-controls">
            <button data-action="minus" data-id="${item.id}">−</button>
            <strong>${item.cantidad}</strong>
            <button data-action="plus" data-id="${item.id}">+</button>
            <button class="remove-btn" data-action="remove" data-id="${item.id}">🗑</button>
          </div>
        </div>
        <strong>${formatoPrecio(item.precio * item.cantidad)}</strong>
      `;

      cartContainer.appendChild(row);
    });
  }

  cartCount.textContent = obtenerCantidadCarrito();
  cartTotal.textContent = formatoPrecio(obtenerTotalCarrito());
  btnComprar.disabled = carrito.length === 0;
}

function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);

  if (!producto || producto.stock <= 0) return;

  const item = carrito.find(p => p.id === id);

  if (item) {
    if (item.cantidad < producto.stock) {
      item.cantidad++;
    }
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      imagen: producto.imagen,
      cantidad: 1
    });
  }

  renderCarrito();
}

function cambiarCantidad(id, cambio) {
  const item = carrito.find(p => p.id === id);
  const producto = productos.find(p => p.id === id);

  if (!item || !producto) return;

  const nuevaCantidad = item.cantidad + cambio;

  if (nuevaCantidad <= 0) {
    carrito = carrito.filter(p => p.id !== id);
  } else if (nuevaCantidad <= producto.stock) {
    item.cantidad = nuevaCantidad;
  }

  renderCarrito();
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter(item => item.id !== id);
  renderCarrito();
}

function abrirModal(modal) {
  modal.classList.remove("hidden");
}

function cerrarModal(modal) {
  modal.classList.add("hidden");
}

function iniciarCompra() {
  if (carrito.length === 0) return;

  document.getElementById("paymentTotal").textContent =
    formatoPrecio(obtenerTotalCarrito());

  abrirModal(paymentModal);
}

async function realizarVenta(medioPago) {
  try {
    const response = await fetch(`${API_URL}/ventas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        medioPago,
        productos: carrito.map(item => ({
          productoId: item.id,
          cantidad: item.cantidad
        }))
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudo realizar la venta.");
    }

    cerrarModal(paymentModal);

    document.getElementById("successMessage").textContent =
      `Venta de ${formatoPrecio(data.venta.total)} registrada mediante ${medioPago.toUpperCase()}.`;

    carrito = [];

    await cargarProductos();
    renderCarrito();

    abrirModal(successModal);
  } catch (error) {
    alert(error.message);
  }
}

async function cargarResumenVentas() {
  try {
    const response = await fetch(`${API_URL}/ventas/resumen`);

    if (!response.ok) {
      throw new Error("No se pudo obtener el resumen.");
    }

    const resumen = await response.json();

    document.getElementById("cashSales").textContent =
      formatoPrecio(resumen.efectivo.total);

    document.getElementById("qrSales").textContent =
      formatoPrecio(resumen.qr.total);

    document.getElementById("totalSales").textContent =
      formatoPrecio(resumen.total.total);

    document.getElementById("cashCount").textContent =
      `${resumen.efectivo.cantidad} ${resumen.efectivo.cantidad === 1 ? "venta" : "ventas"}`;

    document.getElementById("qrCount").textContent =
      `${resumen.qr.cantidad} ${resumen.qr.cantidad === 1 ? "venta" : "ventas"}`;

    document.getElementById("totalCount").textContent =
      `${resumen.total.cantidad} ${resumen.total.cantidad === 1 ? "venta" : "ventas"}`;
  } catch (error) {
    console.error(error);
  }
}

async function cargarUltimasVentas() {
  const response = await fetch(`${API_URL}/ventas?limit=10`);
  const ventas = await response.json();
  const salesList = document.getElementById("salesList");

  if (!ventas.length) {
    salesList.innerHTML = `<p class="empty">Todavía no hay ventas.</p>`;
    return;
  }

  salesList.innerHTML = "";

  ventas.forEach(venta => {
    const row = document.createElement("div");
    row.className = "sale-row";

    row.innerHTML = `
      <span>
        ${venta.medio_pago === "efectivo" ? "💵" : "📱"}
        ${new Date(venta.fecha).toLocaleString("es-AR")}
      </span>
      <strong>${formatoPrecio(Number(venta.total))}</strong>
    `;

    salesList.appendChild(row);
  });
}

productsContainer.addEventListener("click", event => {
  const button = event.target.closest(".add-btn");
  if (!button) return;

  agregarAlCarrito(Number(button.dataset.id));
});

cartContainer.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "plus") cambiarCantidad(id, 1);
  if (action === "minus") cambiarCantidad(id, -1);
  if (action === "remove") eliminarDelCarrito(id);
});

btnComprar.addEventListener("click", iniciarCompra);

document.querySelectorAll(".payment-btn").forEach(button => {
  button.addEventListener("click", () => {
    realizarVenta(button.dataset.payment);
  });
});

document.getElementById("btnVentas").addEventListener("click", async () => {
  await cargarResumenVentas();
  await cargarUltimasVentas();
  abrirModal(salesModal);
});

document.getElementById("btnSuccess").addEventListener("click", () => {
  cerrarModal(successModal);
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    cerrarModal(document.getElementById(button.dataset.close));
  });
});

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) cerrarModal(modal);
  });
});

cargarProductos();
renderCarrito();
