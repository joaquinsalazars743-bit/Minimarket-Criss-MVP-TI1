const API_URL = "http://127.0.0.1:8000/api/v1";
const CLAVE_TOKEN = "minimarket_token";
const CLAVE_USUARIO = "minimarket_usuario";

export function obtenerToken() { return localStorage.getItem(CLAVE_TOKEN); }
export function obtenerUsuario() {
  const usuario = localStorage.getItem(CLAVE_USUARIO);
  if (!usuario) return null;
  try { return JSON.parse(usuario); } catch { return null; }
}
function guardarSesion(datos) {
  localStorage.setItem(CLAVE_TOKEN, datos.access_token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(datos.usuario));
}
export function cerrarSesion() {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
}
export async function iniciarSesion(email, password) {
  const respuesta = await fetch(`${API_URL}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.detail || "No se pudo iniciar sesión.");
  guardarSesion(datos);
  return datos.usuario;
}
async function solicitarAPI(ruta, opciones = {}) {
  const token = obtenerToken();
  const headers = { Accept: "application/json", ...opciones.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opciones.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers });
  if (respuesta.status === 401) {
    cerrarSesion();
    throw new Error("Tu sesión expiró o no es válida. Inicia sesión nuevamente.");
  }
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const detalle = datos?.detail;
    const mensaje = Array.isArray(detalle) ? detalle.map((error) => error.msg).join(", ") : detalle;
    throw new Error(mensaje || "Ocurrió un error al consultar el servidor.");
  }
  return datos;
}
export async function listarProductos() { return await solicitarAPI("/productos"); }
export async function registrarProducto(producto) { return await solicitarAPI("/productos", { method: "POST", body: JSON.stringify(producto) }); }
export async function editarProducto(productoId, producto) { return await solicitarAPI(`/productos/${productoId}`, { method: "PUT", body: JSON.stringify(producto) }); }
export async function desactivarProducto(productoId) { return await solicitarAPI(`/productos/${productoId}/desactivar`, { method: "PATCH" }); }
export async function listarCompras() { return await solicitarAPI("/compras"); }
export async function registrarCompra(compra) { return await solicitarAPI("/compras", { method: "POST", body: JSON.stringify(compra) }); }
export async function listarVentas() { return await solicitarAPI("/ventas"); }
export async function registrarVenta(venta) { return await solicitarAPI("/ventas", { method: "POST", body: JSON.stringify(venta) }); }
export async function listarMovimientosStock() { return await solicitarAPI("/stock/movimientos"); }
