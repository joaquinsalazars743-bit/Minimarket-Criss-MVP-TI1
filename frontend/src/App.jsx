import { useState, useEffect } from "react";
import {
  listarProductos,
  listarCompras,
  listarVentas,
  listarMovimientosStock,
  registrarProducto,
  editarProducto,
  desactivarProducto,
  registrarCompra,
  registrarVenta,
  iniciarSesion,
  obtenerToken,
  obtenerUsuario,
  cerrarSesion,
} from "./services/api";
import "./App.css";

const opciones = [
  { nombre: "Panel principal", icono: "▦", roles: ["ADMINISTRADOR", "VENDEDOR", "ENCARGADO_ALMACEN"] },
  { nombre: "Productos", icono: "▤", roles: ["ADMINISTRADOR", "VENDEDOR", "ENCARGADO_ALMACEN"] },
  { nombre: "Compras", icono: "↓", roles: ["ADMINISTRADOR", "ENCARGADO_ALMACEN"] },
  { nombre: "Ventas", icono: "↑", roles: ["ADMINISTRADOR", "VENDEDOR"] },
  { nombre: "Stock", icono: "▥", roles: ["ADMINISTRADOR", "ENCARGADO_ALMACEN"] },
];

const normalizarRol = (usuario) => {
  const rol = usuario?.rol;
  if (typeof rol === "string") return rol.toUpperCase();
  if (rol && typeof rol === "object") {
    return String(rol.nombre || rol.nombre_rol || "").toUpperCase();
  }
  return String(usuario?.nombre_rol || "").toUpperCase();
};

const moneda = (valor) =>
  `Bs ${Number(valor ?? 0).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fecha = (valor, incluirHora = false) => {
  if (!valor) return "—";
  const fechaConvertida = new Date(valor);
  if (Number.isNaN(fechaConvertida.getTime())) return "—";
  return fechaConvertida.toLocaleString("es-BO", incluirHora
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "short" });
};

const formularioVacio = {
  codigo: "",
  nombre: "",
  descripcion: "",
  precio_compra: "0.00",
  precio_venta: "0.00",
  stock_actual: "0",
  stock_minimo: "0",
};

function App() {
  const [usuario, setUsuario] = useState(() =>
    obtenerToken() ? obtenerUsuario() : null
  );
  const [seccion, setSeccion] = useState("Panel principal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [avisoSesion, setAvisoSesion] = useState("");

  const [productos, setProductos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [movimientosStock, setMovimientosStock] = useState([]);

  const [cargando, setCargando] = useState(false);
  const [errorDatos, setErrorDatos] = useState("");
  const [mensajeProducto, setMensajeProducto] = useState("");
  const [errorProducto, setErrorProducto] = useState("");
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [mostrarFormularioProducto, setMostrarFormularioProducto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [formularioProducto, setFormularioProducto] = useState(formularioVacio);
  const [mostrarFormularioCompra, setMostrarFormularioCompra] = useState(false);
  const [proveedorCompra, setProveedorCompra] = useState("");
  const [lineasCompra, setLineasCompra] = useState([{ id_producto: "", cantidad: "1", precio_unitario: "" }]);
  const [mostrarFormularioVenta, setMostrarFormularioVenta] = useState(false);
  const [lineasVenta, setLineasVenta] = useState([{ id_producto: "", cantidad: "1" }]);
  const [guardandoOperacion, setGuardandoOperacion] = useState(false);
  const [mensajeOperacion, setMensajeOperacion] = useState("");
  const [errorOperacion, setErrorOperacion] = useState("");

  const rol = normalizarRol(usuario);
  const opcionesVisibles = opciones.filter((opcion) =>
    opcion.roles.includes(rol)
  );
  const puedeGestionarProductos = [
    "ADMINISTRADOR",
    "ENCARGADO_ALMACEN",
  ].includes(rol);

  useEffect(() => {
    if (!usuario) return;

    let cancelado = false;

    async function cargarSeccion() {
      setCargando(true);
      setErrorDatos("");

      try {
        if (seccion === "Compras" || seccion === "Ventas") {
          const catalogo = await listarProductos();
          if (!cancelado) setProductos(catalogo);
        }
        if (seccion === "Productos") {
          const datos = await listarProductos();
          if (!cancelado) setProductos(datos);
        } else if (seccion === "Compras") {
          const datos = await listarCompras();
          if (!cancelado) setCompras(datos);
        } else if (seccion === "Ventas") {
          const datos = await listarVentas();
          if (!cancelado) setVentas(datos);
        } else if (seccion === "Stock") {
          const datos = await listarMovimientosStock();
          if (!cancelado) setMovimientosStock(datos);
        }
      } catch (error) {
        if (!cancelado) {
          setErrorDatos(error.message || "No se pudieron cargar los datos.");

          if (
            error.message?.toLowerCase().includes("sesión expiró") ||
            error.message?.toLowerCase().includes("no es válida")
          ) {
            cerrarSesion();
            setUsuario(null);
            setPassword("");
          }
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarSeccion();

    return () => {
      cancelado = true;
    };
  }, [seccion, usuario]);

  async function recargarProductos() {
    const datos = await listarProductos();
    setProductos(datos);
  }

  function abrirNuevoProducto() {
    setFormularioProducto(formularioVacio);
    setProductoEditando(null);
    setErrorProducto("");
    setMensajeProducto("");
    setMostrarFormularioProducto(true);
  }

  function abrirEditarProducto(producto) {
    setFormularioProducto({
      codigo: producto.codigo ?? "",
      nombre: producto.nombre ?? "",
      descripcion: producto.descripcion ?? "",
      precio_compra: String(producto.precio_compra ?? "0.00"),
      precio_venta: String(producto.precio_venta ?? "0.00"),
      stock_actual: String(producto.stock_actual ?? 0),
      stock_minimo: String(producto.stock_minimo ?? 0),
    });
    setProductoEditando(producto);
    setErrorProducto("");
    setMensajeProducto("");
    setMostrarFormularioProducto(true);
  }

  function cerrarFormularioProducto() {
    if (guardandoProducto) return;
    setMostrarFormularioProducto(false);
    setProductoEditando(null);
    setFormularioProducto(formularioVacio);
    setErrorProducto("");
  }

  function cambiarCampoProducto(evento) {
    const { name, value } = evento.target;
    setFormularioProducto((actual) => ({ ...actual, [name]: value }));
  }

  async function manejarGuardarProducto(evento) {
    evento.preventDefault();
    setErrorProducto("");
    setMensajeProducto("");

    const precioCompra = Number(formularioProducto.precio_compra);
    const precioVenta = Number(formularioProducto.precio_venta);
    const stockActual = Number(formularioProducto.stock_actual);
    const stockMinimo = Number(formularioProducto.stock_minimo);

    if (!formularioProducto.codigo.trim() || !formularioProducto.nombre.trim()) {
      setErrorProducto("El código y el nombre del producto son obligatorios.");
      return;
    }

    if (
      !Number.isFinite(precioCompra) ||
      !Number.isFinite(precioVenta) ||
      precioCompra < 0 ||
      precioVenta < 0
    ) {
      setErrorProducto("Los precios deben ser números iguales o mayores que cero.");
      return;
    }

    if (
      !Number.isInteger(stockActual) ||
      !Number.isInteger(stockMinimo) ||
      stockActual < 0 ||
      stockMinimo < 0
    ) {
      setErrorProducto("El stock actual y mínimo deben ser números enteros iguales o mayores que cero.");
      return;
    }

    const datosProducto = {
      codigo: formularioProducto.codigo.trim(),
      nombre: formularioProducto.nombre.trim(),
      descripcion: formularioProducto.descripcion.trim() || null,
      precio_compra: precioCompra,
      precio_venta: precioVenta,
      stock_actual: stockActual,
      stock_minimo: stockMinimo,
    };

    setGuardandoProducto(true);

    try {
      if (productoEditando) {
        await editarProducto(productoEditando.id, datosProducto);
        setMensajeProducto("Producto actualizado correctamente.");
      } else {
        await registrarProducto(datosProducto);
        setMensajeProducto("Producto registrado correctamente.");
      }

      await recargarProductos();
      setMostrarFormularioProducto(false);
      setProductoEditando(null);
      setFormularioProducto(formularioVacio);
    } catch (error) {
      setErrorProducto(error.message || "No se pudo guardar el producto.");
    } finally {
      setGuardandoProducto(false);
    }
  }

  async function manejarDesactivarProducto(producto) {
    const confirmar = window.confirm(
      `¿Deseas desactivar el producto "${producto.nombre}"? No aparecerá en el listado activo.`
    );
    if (!confirmar) return;

    setErrorProducto("");
    setMensajeProducto("");

    try {
      await desactivarProducto(producto.id);
      setMensajeProducto(`El producto "${producto.nombre}" fue desactivado.`);
      await recargarProductos();
    } catch (error) {
      setErrorProducto(error.message || "No se pudo desactivar el producto.");
    }
  }

  function agregarLineaCompra() {
    setLineasCompra((actual) => [...actual, { id_producto: "", cantidad: "1", precio_unitario: "" }]);
  }

  function actualizarLineaCompra(indice, campo, valor) {
    setLineasCompra((actual) => actual.map((linea, i) => {
      if (i !== indice) return linea;
      const siguiente = { ...linea, [campo]: valor };
      if (campo === "id_producto") {
        const producto = productos.find((p) => String(p.id) === valor);
        siguiente.precio_unitario = producto ? String(producto.precio_compra) : "";
      }
      return siguiente;
    }));
  }

  async function manejarRegistrarCompra(evento) {
    evento.preventDefault();
    setErrorOperacion(""); setMensajeOperacion("");
    if (!proveedorCompra.trim()) { setErrorOperacion("Ingresa el nombre del proveedor."); return; }
    if (lineasCompra.some((l) => !l.id_producto || !Number.isInteger(Number(l.cantidad)) || Number(l.cantidad) < 1 || !Number.isFinite(Number(l.precio_unitario)) || Number(l.precio_unitario) < 0)) {
      setErrorOperacion("Revisa los productos, cantidades y precios de la compra."); return;
    }
    setGuardandoOperacion(true);
    try {
      await registrarCompra({ id_usuario: usuario.id, proveedor: proveedorCompra.trim(), detalles: lineasCompra.map((l) => ({ id_producto: Number(l.id_producto), cantidad: Number(l.cantidad), precio_unitario: Number(l.precio_unitario) })) });
      setMensajeOperacion("Compra registrada correctamente y stock actualizado.");
      setProveedorCompra(""); setLineasCompra([{ id_producto: "", cantidad: "1", precio_unitario: "" }]); setMostrarFormularioCompra(false);
      setCompras(await listarCompras()); setProductos(await listarProductos()); setMovimientosStock(await listarMovimientosStock());
    } catch (error) { setErrorOperacion(error.message || "No se pudo registrar la compra."); }
    finally { setGuardandoOperacion(false); }
  }

  function actualizarLineaVenta(indice, campo, valor) {
    setLineasVenta((actual) => actual.map((linea, i) => i === indice ? { ...linea, [campo]: valor } : linea));
  }

  async function manejarRegistrarVenta(evento) {
    evento.preventDefault();
    setErrorOperacion(""); setMensajeOperacion("");
    if (lineasVenta.some((l) => !l.id_producto || !Number.isInteger(Number(l.cantidad)) || Number(l.cantidad) < 1)) {
      setErrorOperacion("Selecciona los productos e ingresa cantidades enteras mayores que cero."); return;
    }
    setGuardandoOperacion(true);
    try {
      await registrarVenta({ id_usuario: usuario.id, detalles: lineasVenta.map((l) => ({ id_producto: Number(l.id_producto), cantidad: Number(l.cantidad) })) });
      setMensajeOperacion("Venta registrada correctamente y stock actualizado.");
      setLineasVenta([{ id_producto: "", cantidad: "1" }]); setMostrarFormularioVenta(false);
      setVentas(await listarVentas()); setProductos(await listarProductos()); setMovimientosStock(await listarMovimientosStock());
    } catch (error) { setErrorOperacion(error.message || "No se pudo registrar la venta."); }
    finally { setGuardandoOperacion(false); }
  }

  async function manejarLogin(evento) {
    evento.preventDefault();
    setErrorLogin("");

    if (!email.trim() || !password) {
      setErrorLogin("Ingresa tu correo electrónico y contraseña.");
      return;
    }

    setCargandoLogin(true);

    try {
      const usuarioAutenticado = await iniciarSesion(email, password);
      setUsuario(usuarioAutenticado);
      setSeccion("Panel principal");
      setPassword("");
      setAvisoSesion("");
    } catch (error) {
      setErrorLogin(error.message || "No se pudo iniciar sesión.");
    } finally {
      setCargandoLogin(false);
    }
  }

  function manejarCerrarSesion() {
    cerrarSesion();
    setUsuario(null);
    setEmail("");
    setPassword("");
    setErrorLogin("");
    setErrorDatos("");
    setAvisoSesion("");
    setSeccion("Panel principal");
    setProductos([]);
    setCompras([]);
    setVentas([]);
    setMovimientosStock([]);
    setMostrarFormularioProducto(false);
    setProductoEditando(null);
    setFormularioProducto(formularioVacio);
  }

  function cambiarSeccion(nombre) {
    setSeccion(nombre);
    setErrorDatos("");
    setMensajeProducto("");
    setErrorProducto("");
  }

  if (!usuario) {
    return (
      <div className="login-pagina">
        <section className="login-presentacion">
          <div className="login-marca">
            <div className="login-logo">C</div>
            <div>
              <h1>Minimarket Criss</h1>
              <span>Sistema de gestión</span>
            </div>
          </div>

          <div className="login-mensaje">
            <span className="etiqueta">GESTIÓN COMERCIAL</span>
            <h2>Todo tu minimarket, en un solo lugar.</h2>
            <p>
              Administra productos, controla las compras, registra las ventas
              y consulta los movimientos de stock desde una plataforma.
            </p>
            <div className="login-beneficios">
              <div><span>✓</span> Información centralizada</div>
              <div><span>✓</span> Control de existencias</div>
              <div><span>✓</span> Acceso según tu rol</div>
            </div>
          </div>

          <p className="login-pie">
            Sistema de gestión web · Minimarket Criss
          </p>
        </section>

        <section className="login-formulario-contenedor">
          <form className="login-formulario" onSubmit={manejarLogin}>
            <div className="login-icono-acceso">↗</div>
            <span className="etiqueta">BIENVENIDO</span>
            <h2>Iniciar sesión</h2>
            <p className="login-descripcion">
              Ingresa tus credenciales para acceder al sistema.
            </p>

            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              autoComplete="username"
              required
            />

            <label htmlFor="password">Contraseña</label>
            <div className="login-password">
              <input
                id="password"
                type={mostrarPassword ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="mostrar-password"
                onClick={() => setMostrarPassword((actual) => !actual)}
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            {errorLogin && (
              <div className="mensaje-error" role="alert">{errorLogin}</div>
            )}

            <button
              type="submit"
              className="boton-login"
              disabled={cargandoLogin}
            >
              {cargandoLogin ? "Verificando acceso..." : "Ingresar al sistema"}
              {!cargandoLogin && <span> →</span>}
            </button>

            <div className="login-seguridad">
              <span>▣</span>
              Acceso protegido mediante autenticación.
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="aplicacion">
      <aside className="barra-lateral">
        <div className="marca">
          <div className="marca-icono">C</div>
          <div>
            <h2>Minimarket Criss</h2>
            <span>Sistema de gestión</span>
          </div>
        </div>

        <p className="menu-titulo">MENÚ PRINCIPAL</p>

        <nav className="menu">
          {opcionesVisibles.map((opcion) => (
            <button
              key={opcion.nombre}
              className={seccion === opcion.nombre ? "menu-item activo" : "menu-item"}
              onClick={() => cambiarSeccion(opcion.nombre)}
            >
              <span className="menu-icono">{opcion.icono}</span>
              {opcion.nombre}
            </button>
          ))}
        </nav>

        <div className="usuario">
          <div className="avatar">
            {(usuario.nombre || usuario.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="usuario-datos">
            <strong>{usuario.nombre || "Usuario"}</strong>
            <span>{rol.replaceAll("_", " ") || "Usuario del sistema"}</span>
          </div>
          <button
            className="boton-salir"
            onClick={manejarCerrarSesion}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            ↪
          </button>
        </div>
      </aside>

      <main className="contenido">
        <header className="encabezado">
          <div>
            <span className="ruta">Minimarket Criss / Sistema</span>
            <h1>{seccion}</h1>
          </div>

          <div className="estado-conexion">
            <span className="punto-verde"></span>
            Sesión activa
          </div>
        </header>

        {seccion === "Panel principal" ? (
          <>
            <section className="bienvenida">
              <div>
                <span className="etiqueta">PANEL DE CONTROL</span>
                <h2>¡Bienvenido, {usuario.nombre || "usuario"}!</h2>
                <p>
                  Gestiona las operaciones de Minimarket Criss según los
                  permisos asignados a tu cuenta.
                </p>
              </div>
              <div className="bienvenida-icono">▦</div>
            </section>

            <section className="resumen">
              {opcionesVisibles.filter((opcion) => opcion.nombre !== "Panel principal").map((opcion) => (
                <article className="tarjeta" key={opcion.nombre}>
                  <div className="tarjeta-superior">
                    <span>{opcion.nombre}</span>
                    <span className="tarjeta-icono azul">{opcion.icono}</span>
                  </div>
                  <strong>
                    {opcion.nombre === "Productos" && "Catálogo"}
                    {opcion.nombre === "Compras" && "Abastecimiento"}
                    {opcion.nombre === "Ventas" && "Comercialización"}
                    {opcion.nombre === "Stock" && "Existencias"}
                  </strong>
                  <p>
                    {opcion.nombre === "Productos" && "Consulta y administra los productos registrados."}
                    {opcion.nombre === "Compras" && "Consulta las compras registradas."}
                    {opcion.nombre === "Ventas" && "Consulta las ventas realizadas."}
                    {opcion.nombre === "Stock" && "Revisa los movimientos de mercadería."}
                  </p>
                  <button onClick={() => cambiarSeccion(opcion.nombre)}>
                    Abrir módulo →
                  </button>
                </article>
              ))}
            </section>

            <section className="panel-informativo">
              <div>
                <h3>Acceso al sistema</h3>
                <p>Tu sesión está iniciada y el menú se adapta a tu rol de usuario.</p>
              </div>
              <span className="estado-etiqueta">Autenticado</span>
            </section>
          </>
        ) : (
          <section className="panel-informativo">
            <div className="titulo-panel">
              <div>
                <h2>
                  {seccion === "Productos" && "Productos registrados"}
                  {seccion === "Compras" && "Compras registradas"}
                  {seccion === "Ventas" && "Ventas registradas"}
                  {seccion === "Stock" && "Movimientos de stock"}
                </h2>
                <p>
                  {seccion === "Productos" && "Consulta y administra los productos almacenados en la base de datos."}
                  {seccion === "Compras" && "Consulta las compras realizadas en el minimarket."}
                  {seccion === "Ventas" && "Consulta las ventas realizadas en el minimarket."}
                  {seccion === "Stock" && "Consulta las entradas, salidas y ajustes de mercadería."}
                </p>
              </div>
              <div className="acciones-encabezado">
                {seccion === "Productos" && puedeGestionarProductos && (
                  <button className="boton-primario" onClick={abrirNuevoProducto}>+ Nuevo producto</button>
                )}
                {seccion === "Compras" && <button className="boton-primario" onClick={() => { setErrorOperacion(""); setMensajeOperacion(""); setMostrarFormularioCompra((v) => !v); setMostrarFormularioVenta(false); }}>+ Registrar compra</button>}
                {seccion === "Ventas" && <button className="boton-primario" onClick={() => { setErrorOperacion(""); setMensajeOperacion(""); setMostrarFormularioVenta((v) => !v); setMostrarFormularioCompra(false); }}>+ Registrar venta</button>}
                <button
                  className="boton-secundario"
                  onClick={() => cambiarSeccion(seccion)}
                  disabled={cargando}
                >
                  ↻ Actualizar
                </button>
              </div>
            </div>

            {mensajeProducto && (
              <div className="mensaje-exito" role="status">{mensajeProducto}</div>
            )}
            {errorProducto && (
              <div className="mensaje-error" role="alert">{errorProducto}</div>
            )}

            {seccion === "Productos" && mostrarFormularioProducto && puedeGestionarProductos && (
              <form className="formulario-producto" onSubmit={manejarGuardarProducto}>
                <div className="formulario-producto-titulo">
                  <div>
                    <h3>{productoEditando ? "Editar producto" : "Registrar producto"}</h3>
                    <p>Completa los datos solicitados para {productoEditando ? "actualizar el producto" : "registrarlo"}.</p>
                  </div>
                  <button type="button" className="boton-cerrar-formulario" onClick={cerrarFormularioProducto} disabled={guardandoProducto} aria-label="Cerrar formulario">
                    ×
                  </button>
                </div>

                <div className="rejilla-formulario">
                  <div className="campo-formulario">
                    <label htmlFor="producto-codigo">Código *</label>
                    <input id="producto-codigo" name="codigo" value={formularioProducto.codigo} onChange={cambiarCampoProducto} maxLength={50} required />
                  </div>
                  <div className="campo-formulario">
                    <label htmlFor="producto-nombre">Nombre *</label>
                    <input id="producto-nombre" name="nombre" value={formularioProducto.nombre} onChange={cambiarCampoProducto} maxLength={120} required />
                  </div>
                  <div className="campo-formulario campo-completo">
                    <label htmlFor="producto-descripcion">Descripción</label>
                    <textarea id="producto-descripcion" name="descripcion" value={formularioProducto.descripcion} onChange={cambiarCampoProducto} rows={2} />
                  </div>
                  <div className="campo-formulario">
                    <label htmlFor="producto-precio-compra">Precio de compra (Bs) *</label>
                    <input id="producto-precio-compra" type="number" name="precio_compra" value={formularioProducto.precio_compra} onChange={cambiarCampoProducto} min="0" step="0.01" required />
                  </div>
                  <div className="campo-formulario">
                    <label htmlFor="producto-precio-venta">Precio de venta (Bs) *</label>
                    <input id="producto-precio-venta" type="number" name="precio_venta" value={formularioProducto.precio_venta} onChange={cambiarCampoProducto} min="0" step="0.01" required />
                  </div>
                  <div className="campo-formulario">
                    <label htmlFor="producto-stock-actual">Stock actual *</label>
                    <input id="producto-stock-actual" type="number" name="stock_actual" value={formularioProducto.stock_actual} onChange={cambiarCampoProducto} min="0" step="1" required />
                  </div>
                  <div className="campo-formulario">
                    <label htmlFor="producto-stock-minimo">Stock mínimo *</label>
                    <input id="producto-stock-minimo" type="number" name="stock_minimo" value={formularioProducto.stock_minimo} onChange={cambiarCampoProducto} min="0" step="1" required />
                  </div>
                </div>

                {errorProducto && (
                  <div className="mensaje-error" role="alert">{errorProducto}</div>
                )}

                <div className="acciones-formulario">
                  <button type="button" className="boton-secundario" onClick={cerrarFormularioProducto} disabled={guardandoProducto}>
                    Cancelar
                  </button>
                  <button type="submit" className="boton-primario" disabled={guardandoProducto}>
                    {guardandoProducto ? "Guardando..." : productoEditando ? "Guardar cambios" : "Registrar producto"}
                  </button>
                </div>
              </form>
            )}

            {(seccion === "Compras" || seccion === "Ventas") && mensajeOperacion && <div className="mensaje-exito" role="status">{mensajeOperacion}</div>}
            {(seccion === "Compras" || seccion === "Ventas") && errorOperacion && <div className="mensaje-error" role="alert">{errorOperacion}</div>}

            {seccion === "Compras" && mostrarFormularioCompra && (
              <form className="formulario-producto" onSubmit={manejarRegistrarCompra}>
                <h3>Registrar compra</h3>
                <div className="campo-formulario"><label htmlFor="proveedor-compra">Proveedor *</label><input id="proveedor-compra" value={proveedorCompra} onChange={(e) => setProveedorCompra(e.target.value)} maxLength={150} required /></div>
                <h3>Productos de la compra</h3>
                {lineasCompra.map((linea, i) => <div className="rejilla-formulario linea-operacion" key={i}>
                  <div className="campo-formulario"><label>Producto *</label><select value={linea.id_producto} onChange={(e) => actualizarLineaCompra(i, "id_producto", e.target.value)} required><option value="">Seleccionar producto</option>{productos.filter((p) => p.estado).map((p) => <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock_actual})</option>)}</select></div>
                  <div className="campo-formulario"><label>Cantidad *</label><input type="number" min="1" step="1" value={linea.cantidad} onChange={(e) => actualizarLineaCompra(i, "cantidad", e.target.value)} required /></div>
                  <div className="campo-formulario"><label>Precio unitario (Bs) *</label><input type="number" min="0" step="0.01" value={linea.precio_unitario} onChange={(e) => actualizarLineaCompra(i, "precio_unitario", e.target.value)} required /></div>
                  <div className="campo-formulario"><label>Subtotal</label><strong>{moneda(Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0))}</strong></div>
                  {lineasCompra.length > 1 && <button type="button" className="boton-tabla boton-tabla-peligro" onClick={() => setLineasCompra((actual) => actual.filter((_, j) => j !== i))}>Quitar</button>}
                </div>)}
                <p><strong>Total estimado: {moneda(lineasCompra.reduce((t,l) => t + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0))}</strong></p>
                <div className="acciones-formulario"><button type="button" className="boton-secundario" onClick={agregarLineaCompra}>+ Agregar producto</button><button type="button" className="boton-secundario" onClick={() => setMostrarFormularioCompra(false)}>Cancelar</button><button type="submit" className="boton-primario" disabled={guardandoOperacion}>{guardandoOperacion ? "Registrando..." : "Guardar compra"}</button></div>
              </form>
            )}

            {seccion === "Ventas" && mostrarFormularioVenta && (
              <form className="formulario-producto" onSubmit={manejarRegistrarVenta}>
                <h3>Registrar venta</h3>
                {lineasVenta.map((linea, i) => {
                  const producto = productos.find((p) => String(p.id) === String(linea.id_producto));
                  return <div className="rejilla-formulario linea-operacion" key={i}>
                    <div className="campo-formulario"><label>Producto *</label><select value={linea.id_producto} onChange={(e) => actualizarLineaVenta(i, "id_producto", e.target.value)} required><option value="">Seleccionar producto</option>{productos.filter((p) => p.estado).map((p) => <option key={p.id} value={p.id}>{p.nombre} — {moneda(p.precio_venta)} (stock: {p.stock_actual})</option>)}</select></div>
                    <div className="campo-formulario"><label>Cantidad *</label><input type="number" min="1" max={producto?.stock_actual ?? undefined} step="1" value={linea.cantidad} onChange={(e) => actualizarLineaVenta(i, "cantidad", e.target.value)} required /></div>
                    <div className="campo-formulario"><label>Precio unitario</label><strong>{producto ? moneda(producto.precio_venta) : "—"}</strong></div>
                    <div className="campo-formulario"><label>Subtotal</label><strong>{moneda(Number(linea.cantidad || 0) * Number(producto?.precio_venta || 0))}</strong></div>
                    {lineasVenta.length > 1 && <button type="button" className="boton-tabla boton-tabla-peligro" onClick={() => setLineasVenta((actual) => actual.filter((_, j) => j !== i))}>Quitar</button>}
                  </div>;
                })}
                <p><strong>Total estimado: {moneda(lineasVenta.reduce((t,l) => { const p = productos.find((x) => String(x.id) === String(l.id_producto)); return t + Number(l.cantidad || 0) * Number(p?.precio_venta || 0); }, 0))}</strong></p>
                <div className="acciones-formulario"><button type="button" className="boton-secundario" onClick={() => setLineasVenta((actual) => [...actual, { id_producto: "", cantidad: "1" }])}>+ Agregar producto</button><button type="button" className="boton-secundario" onClick={() => setMostrarFormularioVenta(false)}>Cancelar</button><button type="submit" className="boton-primario" disabled={guardandoOperacion}>{guardandoOperacion ? "Registrando..." : "Guardar venta"}</button></div>
              </form>
            )}

            {cargando && <p className="mensaje-carga">Cargando información...</p>}

            {errorDatos && (
              <div className="mensaje-error" role="alert">{errorDatos}</div>
            )}

            {!cargando && !errorDatos && seccion === "Productos" && (
              productos.length === 0 ? <p className="tabla-vacia">No hay productos registrados activos.</p> : (
                <div className="tabla-contenedor">
                  <table>
                    <thead><tr>
                      <th>Código</th><th>Nombre</th><th>Precio compra</th>
                      <th>Precio venta</th><th>Stock</th><th>Estado</th>
                      {puedeGestionarProductos && <th>Acciones</th>}
                    </tr></thead>
                    <tbody>{productos.map((p) => (
                      <tr key={p.id}>
                        <td>{p.codigo}</td><td>{p.nombre}</td>
                        <td>{moneda(p.precio_compra)}</td><td>{moneda(p.precio_venta)}</td>
                        <td>{p.stock_actual}</td>
                        <td><span className={p.estado ? "estado-etiqueta" : "estado-inactivo"}>{p.estado ? "Activo" : "Inactivo"}</span></td>
                        {puedeGestionarProductos && (
                          <td>
                            <div className="acciones-tabla">
                              <button className="boton-tabla" onClick={() => abrirEditarProducto(p)} title={`Editar ${p.nombre}`}>Editar</button>
                              <button className="boton-tabla boton-tabla-peligro" onClick={() => manejarDesactivarProducto(p)} title={`Desactivar ${p.nombre}`}>Desactivar</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )
            )}

            {!cargando && !errorDatos && seccion === "Compras" && (
              compras.length === 0 ? <p className="tabla-vacia">No hay compras registradas.</p> : (
                <div className="tabla-contenedor">
                  <table>
                    <thead><tr><th>N.º</th><th>Proveedor</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
                    <tbody>{compras.map((c) => (
                      <tr key={c.id}>
                        <td>#{c.id}</td><td>{c.proveedor}</td><td>{fecha(c.fecha_compra)}</td>
                        <td>{moneda(c.total)}</td><td>{c.estado}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )
            )}

            {!cargando && !errorDatos && seccion === "Ventas" && (
              ventas.length === 0 ? <p className="tabla-vacia">No hay ventas registradas.</p> : (
                <div className="tabla-contenedor">
                  <table>
                    <thead><tr><th>N.º</th><th>Fecha</th><th>Usuario (ID)</th><th>Total</th><th>Estado</th></tr></thead>
                    <tbody>{ventas.map((v) => (
                      <tr key={v.id}>
                        <td>#{v.id}</td><td>{fecha(v.fecha_venta, true)}</td><td>{v.id_usuario}</td>
                        <td>{moneda(v.total)}</td><td>{v.estado}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )
            )}

            {!cargando && !errorDatos && seccion === "Stock" && (
              movimientosStock.length === 0 ? <p className="tabla-vacia">No hay movimientos de stock registrados.</p> : (
                <div className="tabla-contenedor">
                  <table>
                    <thead><tr>
                      <th>N.º</th><th>Producto</th><th>Tipo</th><th>Cantidad</th>
                      <th>Stock anterior</th><th>Stock nuevo</th><th>Motivo</th><th>Fecha</th>
                    </tr></thead>
                    <tbody>{movimientosStock.map((m) => (
                      <tr key={m.id}>
                        <td>#{m.id}</td><td>{m.nombre_producto || `ID ${m.id_producto}`}</td>
                        <td><span className="estado-etiqueta">{m.tipo}</span></td>
                        <td>{m.cantidad}</td><td>{m.stock_anterior}</td><td>{m.stock_nuevo}</td>
                        <td>{m.motivo || "—"}</td><td>{fecha(m.fecha_movimiento, true)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )
            )}
          </section>
        )}

        <footer>Sistema de gestión web · Minimarket Criss</footer>
      </main>
    </div>
  );
}

export default App;
