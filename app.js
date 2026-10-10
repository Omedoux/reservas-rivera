let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let precioMaximo = 1000;

// Referencias del DOM
const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const ordenPrecio = document.querySelector("#ordenPrecio");
const filtroPrecioMax = document.querySelector("#filtroPrecioMax");
const valorPrecioMax = document.querySelector("#valorPrecioMax");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const estado = document.querySelector("#estado");
const mensajeNotificacion = document.querySelector("#mensajeNotificacion");
const btnVaciar = document.querySelector("#btnVaciar");

let temporizadorAlerta = null;

// Mensajes integrados en la página (Reemplazo de alert)
function mostrarNotificacion(texto, esExito = false) {
  if (temporizadorAlerta) clearTimeout(temporizadorAlerta);

  mensajeNotificacion.textContent = texto;
  mensajeNotificacion.classList.remove("oculto", "exito");
  if (esExito) mensajeNotificacion.classList.add("exito");

  temporizadorAlerta = setTimeout(() => {
    mensajeNotificacion.classList.add("oculto");
  }, 4000);
}

async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("./data/experiencias.json");
    if (!respuesta.ok) throw new Error("No se pudo cargar el catálogo.");

    experiencias = await respuesta.json();
    estado.textContent = `${experiencias.length} experiencias disponibles`;
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    mostrarNotificacion("Error al conectar con los datos de experiencias.");
  }
}

function obtenerResultados() {
  let resultados = [...experiencias];

  // Filtro por categoría
  if (categoriaActual !== "todas") {
    resultados = resultados.filter(e => e.categoria === categoriaActual);
  }

  // Filtro por texto
  if (textoBusqueda !== "") {
    resultados = resultados.filter(e =>
      e.nombre.toLowerCase().includes(textoBusqueda)
    );
  }

  // Filtro por precio máximo
  resultados = resultados.filter(e => e.precio <= precioMaximo);

  // Ordenamiento
  if (ordenActual === "ascendente") resultados.sort((a, b) => a.precio - b.precio);
  if (ordenActual === "descendente") resultados.sort((a, b) => b.precio - a.precio);

  return resultados;
}

function actualizarCatalogo() {
  const resultados = obtenerResultados();

  if (resultados.length === 0) {
    catalogo.innerHTML = '<p class="sin-resultados">No se encontraron experiencias con los filtros seleccionados.</p>';
    estado.textContent = "0 resultados";
    return;
  }

  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen">${e.icono}</div>
      <div class="informacion">
        <span class="categoria">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>
        <label>Personas:
          <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
        </label>
        <button class="btn-reservar" data-id="${e.id}">Agregar</button>
      </div>
    </article>
  `).join("");

  estado.textContent = `${resultados.length} resultados encontrados`;
  agregarEventosReservar();
}

function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => {
      agregarReserva(Number(boton.dataset.id));
    });
  });
}

function agregarReserva(id) {
  const experiencia = experiencias.find(e => e.id === id);
  const entradaCantidad = document.querySelector(`#cantidad-${id}`);
  const cantidad = Number(entradaCantidad.value);

  if (isNaN(cantidad) || cantidad < 1) {
    mostrarNotificacion("Por favor selecciona una cantidad válida (mínimo 1).");
    return;
  }

  const existente = reservas.find(r => r.experienciaId === id);
  const cantidadActual = existente ? existente.cantidad : 0;
  const nuevaCantidadTotal = cantidadActual + cantidad;

  if (nuevaCantidadTotal > experiencia.cupo) {
    mostrarNotificacion(`No se puede reservar: excede el cupo máximo de ${experiencia.cupo} lugares.`);
    return;
  }

  if (existente) {
    existente.cantidad = nuevaCantidadTotal;
    existente.subtotal = nuevaCantidadTotal * experiencia.precio;
  } else {
    reservas.push({
      experienciaId: id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad: nuevaCantidadTotal,
      cupo: experiencia.cupo,
      subtotal: nuevaCantidadTotal * experiencia.precio
    });
  }

  mostrarNotificacion(`Se agregaron ${cantidad} boleto(s) a ${experiencia.nombre}.`, true);
  mostrarReservas();
}

function modificarCantidad(id, delta) {
  const reserva = reservas.find(r => r.experienciaId === id);
  if (!reserva) return;

  const nuevaCantidad = reserva.cantidad + delta;

  if (nuevaCantidad > reserva.cupo) {
    mostrarNotificacion(`Límite alcanzado: Cupo máximo de ${reserva.cupo} personas.`);
    return;
  }

  if (nuevaCantidad <= 0) {
    eliminarReserva(id);
    return;
  }

  reserva.cantidad = nuevaCantidad;
  reserva.subtotal = reserva.cantidad * reserva.precio;
  mostrarReservas();
}

function eliminarReserva(id) {
  reservas = reservas.filter(r => r.experienciaId !== id);
  mostrarNotificacion("Experiencia eliminada de la reserva.", true);
  mostrarReservas();
}

function vaciarReservacion() {
  const confirmar = confirm("¿Estás seguro de que deseas vaciar todas tus reservaciones?");
  if (confirmar) {
    reservas = [];
    mostrarNotificacion("Se ha vaciado la reservación.", true);
    mostrarReservas();
  }
}

function mostrarReservas() {
  if (reservas.length === 0) {
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    total.textContent = "$0 MXN";
    totalPersonas.textContent = "0";
    btnVaciar.classList.add("oculto");
    return;
  }

  btnVaciar.classList.remove("oculto");

  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <p>$${r.precio} MXN por persona</p>
      </div>
      <div class="acciones-reserva">
        <div class="controles-cantidad">
          <button class="btn-qty" data-accion="dec" data-id="${r.experienciaId}">-</button>
          <span><strong>${r.cantidad}</strong> pers.</span>
          <button class="btn-qty" data-accion="inc" data-id="${r.experienciaId}">+</button>
        </div>
        <strong>$${r.subtotal} MXN</strong>
        <button class="btn-eliminar" data-id="${r.experienciaId}">Eliminar</button>
      </div>
    </article>
  `).join("");

  // Cálculo total de importe y personas
  const sumaTotal = reservas.reduce((suma, r) => suma + r.subtotal, 0);
  const personasTotales = reservas.reduce((suma, r) => suma + r.cantidad, 0);

  total.textContent = `$${sumaTotal} MXN`;
  totalPersonas.textContent = personasTotales;

  agregarEventosResumen();
}

function agregarEventosResumen() {
  // Eventos para + y -
  document.querySelectorAll(".btn-qty").forEach(boton => {
    boton.addEventListener("click", () => {
      const id = Number(boton.dataset.id);
      const delta = boton.dataset.accion === "inc" ? 1 : -1;
      modificarCantidad(id, delta);
    });
  });

  // Evento eliminar individual
  document.querySelectorAll(".btn-eliminar").forEach(boton => {
    boton.addEventListener("click", () => {
      eliminarReserva(Number(boton.dataset.id));
    });
  });
}

// Controladores de eventos de la barra superior
buscador.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase();
  actualizarCatalogo();
});

filtroCategoria.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value;
  actualizarCatalogo();
});

ordenPrecio.addEventListener("change", () => {
  ordenActual = ordenPrecio.value;
  actualizarCatalogo();
});

filtroPrecioMax.addEventListener("input", (e) => {
  precioMaximo = Number(e.target.value);
  valorPrecioMax.textContent = precioMaximo;
  actualizarCatalogo();
});

btnVaciar.addEventListener("click", vaciarReservacion);

// Inicio
cargarExperiencias();