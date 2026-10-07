// Coordinador de la vista privada: carga datos de la API, refleja permisos en la
// interfaz y conecta formularios/tablas con sus operaciones. La comprobación de
// rol en el navegador solo controla presentación; el servidor vuelve a autorizar
// cada escritura. Los datos remotos se insertan como texto, no como HTML.
const productsBody = document.querySelector('#products-body');
const stockAlert = document.querySelector('#stock-alert');
const productSearch = document.querySelector('#product-search');
const productSearchStatus = document.querySelector('#product-search-status');
const productSelect = document.querySelector('#product');
const catalogStatus = document.querySelector('#catalog-status');
const catalogError = document.querySelector('#catalog-error');
const movementsBody = document.querySelector('#movements-body');
const movementsStatus = document.querySelector('#movements-status');
const movementsError = document.querySelector('#movements-error');
const movementForm = document.querySelector('#movement-form');
const movementStatus = document.querySelector('#movement-status');
const movementError = document.querySelector('#movement-error');
const movementSubmit = document.querySelector('#movement-submit');
const categoryForm = document.querySelector('#category-form');
const categoryNameInput = document.querySelector('#category-name');
const categorySubmit = document.querySelector('#category-submit');
const categoryStatus = document.querySelector('#category-status');
const categoryError = document.querySelector('#category-error');
const productForm = document.querySelector('#product-form');
const newProductCategory = document.querySelector('#new-product-category');
const productCategoryHint = document.querySelector('#product-category-hint');
const productSubmit = document.querySelector('#product-submit');
const productStatus = document.querySelector('#product-status');
const productError = document.querySelector('#product-error');
const editProductModalElement = document.querySelector('#modalEditarProducto');
const editProductModal = bootstrap.Modal.getOrCreateInstance(editProductModalElement);
const editProductForm = document.querySelector('#edit-product-form');
const editProductId = document.querySelector('#edit-product-id');
const editProductName = document.querySelector('#edit-product-name');
const editProductCategory = document.querySelector('#edit-product-category');
const editMinimumStock = document.querySelector('#edit-minimum-stock');
const editProductSubmit = document.querySelector('#edit-product-submit');
const editProductError = document.querySelector('#edit-product-error');
const productActionsHeader = document.querySelector('#product-actions-header');
const categoryManagement = document.querySelector('#category-management');
const productManagement = document.querySelector('#product-management');
const staffManagementButton = document.querySelector('#staff-management-button');
const employeeForm = document.querySelector('#employee-form');
const employeeSubmit = document.querySelector('#employee-submit');
const employeeStatus = document.querySelector('#employee-status');
const employeeError = document.querySelector('#employee-error');
const usersBody = document.querySelector('#users-body');
const usersStatus = document.querySelector('#users-status');
const usersError = document.querySelector('#users-error');
const staffModalElement = document.querySelector('#modalGestionPersonal');
// El rol persistido mejora la presentación inicial, pero nunca sustituye a la
// autorización RBAC que aplica la API.
const isAdmin = localStorage.getItem('userRole') === 'admin';
let categoriasDisponibles = [];

// Muestra controles administrativos solo a modo de experiencia de usuario.
productActionsHeader.classList.toggle('d-none', !isAdmin);
categoryManagement.classList.toggle('d-none', !isAdmin);
productManagement.classList.toggle('d-none', !isAdmin);
staffManagementButton.classList.toggle('d-none', !isAdmin);

staffModalElement.addEventListener('show.bs.modal', () => {
  if (isAdmin) void cargarUsuarios();
});

/**
 * Centraliza solicitudes same-origin y la interpretación de respuestas JSON.
 * La cookie HttpOnly viaja automáticamente; 401 redirige a acceso y 204 se
 * trata sin intentar decodificar un cuerpo vacío.
 */
async function fetchJSON(url, options) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('La sesión expiró. Inicia sesión nuevamente.');
  }

  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(body?.error || 'No se pudo completar la solicitud.');
  }

  return body;
}

/** Renderiza el directorio y distingue la cuenta actual para evitar su baja. */
async function cargarUsuarios() {
  usersStatus.textContent = 'Cargando usuarios…';
  usersError.textContent = '';

  try {
    const users = await fetchJSON('/api/usuarios');
    usersBody.replaceChildren();

    for (const user of users) {
      const row = document.createElement('tr');
      for (const value of [user.nombre, user.email, user.rol]) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.append(cell);
      }

      const actionsCell = document.createElement('td');
      if (user.esActual) {
        const currentUserLabel = document.createElement('span');
        currentUserLabel.className = 'badge text-bg-secondary';
        currentUserLabel.textContent = 'Cuenta actual';
        actionsCell.append(currentUserLabel);
      } else {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-sm btn-outline-danger';
        deleteButton.type = 'button';
        deleteButton.textContent = 'Eliminar';
        deleteButton.addEventListener('click', () => {
          eliminarUsuario(user.id, user.nombre, deleteButton);
        });
        actionsCell.append(deleteButton);
      }
      row.append(actionsCell);
      usersBody.append(row);
    }

    usersStatus.textContent = users.length
      ? `${users.length} usuario(s) registrados.`
      : 'No hay usuarios registrados.';
  } catch (error) {
    usersStatus.textContent = '';
    usersError.textContent = error.message;
  }
}

async function eliminarUsuario(id, nombre, button) {
  // Confirmación y desactivación evitan bajas accidentales y dobles envíos;
  // el servidor aplica de nuevo la regla de no autoeliminación.
  if (!window.confirm(`¿Eliminar la cuenta de ${nombre}? Esta acción es permanente.`)) {
    return;
  }

  button.disabled = true;
  try {
    await fetchJSON(`/api/usuarios/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    await cargarUsuarios();
  } catch (error) {
    window.alert(error.message);
  } finally {
    button.disabled = false;
  }
}

function requiereReabastecimiento(product) {
  const stock = Number(product.stock_actual);
  const minimum = Number(product.stock_minimo);
  return Number.isFinite(stock) && Number.isFinite(minimum) && stock <= minimum;
}

function normalizarBusqueda(value) {
  // NFD separa diacríticos para que la búsqueda encuentre nombres con o sin
  // acentos, sin cambiar el texto que se presenta en la tabla.
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

function filtrarProductos() {
  const query = normalizarBusqueda(productSearch.value.trim());
  let matchingCount = 0;

  for (const row of productsBody.rows) {
    const productName = normalizarBusqueda(row.cells[0]?.textContent ?? '');
    const matches = productName.includes(query);
    row.hidden = !matches;
    if (matches) matchingCount += 1;
  }

  productSearchStatus.hidden = !query || matchingCount > 0;
  productSearchStatus.textContent = productSearchStatus.hidden
    ? ''
    : 'No hay productos que coincidan con la búsqueda.';
}

/**
 * Actualiza alertas, catálogo y selector de movimientos desde una sola respuesta.
 * Reconstruye las celdas con textContent para que nombres del inventario no se
 * interpreten como marcado HTML.
 */
async function cargarProductos() {
  catalogStatus.textContent = 'Cargando catálogo…';
  catalogError.textContent = '';
  stockAlert.hidden = true;

  try {
    const products = await fetchJSON('/api/productos');
    productsBody.replaceChildren();
    const criticalCount = products.filter(requiereReabastecimiento).length;

    stockAlert.classList.toggle('alert-warning', criticalCount > 0);
    stockAlert.classList.toggle('alert-success', criticalCount === 0);
    stockAlert.textContent = criticalCount
      ? `Atención: ${criticalCount} producto${criticalCount === 1 ? '' : 's'} ${criticalCount === 1 ? 'requiere' : 'requieren'} reabastecimiento.`
      : 'Stock al día: ningún producto requiere reabastecimiento.';
    stockAlert.hidden = false;

    for (const product of products) {
      const row = document.createElement('tr');
      const isCritical = requiereReabastecimiento(product);
      if (isCritical) row.classList.add('table-danger');

      const values = [
        product.nombre,
        product.categoria?.nombre ?? 'Sin categoría',
        product.stock_actual,
        product.stock_minimo
      ];
      for (const [index, value] of values.entries()) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        if (isCritical && index === 2) {
          cell.classList.add('text-danger', 'fw-bold');
        }
        row.append(cell);
      }

      const actionsCell = document.createElement('td');
      actionsCell.classList.toggle('d-none', !isAdmin);
      const editButton = document.createElement('button');
      editButton.className = `btn btn-sm btn-outline-primary${isAdmin ? '' : ' d-none'}`;
      editButton.type = 'button';
      editButton.textContent = 'Editar';
      editButton.addEventListener('click', () => {
        abrirModalEditar(
          product.id,
          product.nombre,
          product.categoria_id,
          product.stock_minimo
        );
      });
      const deleteButton = document.createElement('button');
      deleteButton.className = `btn btn-sm btn-outline-danger ms-2${isAdmin ? '' : ' d-none'}`;
      deleteButton.type = 'button';
      deleteButton.textContent = 'Eliminar';
      deleteButton.addEventListener('click', () => {
        eliminarProducto(product.id, deleteButton);
      });
      actionsCell.append(editButton, deleteButton);
      row.append(actionsCell);
      productsBody.append(row);
    }
    filtrarProductos();

    const selectedId = productSelect.value;
    productSelect.replaceChildren(new Option('Selecciona un producto', ''));
    for (const product of products) {
      productSelect.add(new Option(product.nombre, String(product.id)));
    }
    if (products.some((product) => String(product.id) === selectedId)) {
      productSelect.value = selectedId;
    }

    catalogStatus.textContent = products.length
      ? `${products.length} producto(s) en el catálogo.`
      : 'No hay productos registrados.';
  } catch (error) {
    catalogStatus.textContent = '';
    catalogError.textContent = error.message;
  }
}

productSearch.addEventListener('input', filtrarProductos);

async function eliminarProducto(id, button) {
  const confirmed = window.confirm(
    '¿Estás seguro de que deseas eliminar este producto de forma permanente?'
  );
  if (!confirmed) return;

  button.disabled = true;
  try {
    await fetchJSON(`/api/productos/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    await cargarProductos();
  } catch (error) {
    window.alert(error.message);
  } finally {
    button.disabled = false;
  }
}

function abrirModalEditar(id, nombre, categoria_id, stock_minimo) {
  // Las opciones usan el catálogo cargado en memoria; se conserva el id para
  // construir la petición de actualización al confirmar el formulario.
  editProductId.value = String(id);
  editProductName.value = nombre;
  editProductCategory.replaceChildren(new Option('Selecciona una categoría', ''));

  for (const category of categoriasDisponibles) {
    editProductCategory.add(new Option(category.nombre, String(category.id)));
  }

  editProductCategory.value = String(categoria_id);
  editMinimumStock.value = String(stock_minimo);
  editProductError.textContent = '';
  editProductModal.show();
}

editProductForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  editProductError.textContent = '';
  editProductSubmit.disabled = true;

  const formData = new FormData(editProductForm);
  const payload = {
    nombre: String(formData.get('nombre')).trim(),
    categoria_id: Number(formData.get('categoria_id')),
    stock_minimo: Number(formData.get('stock_minimo'))
  };

  try {
    await fetchJSON(`/api/productos/${encodeURIComponent(editProductId.value)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    editProductModal.hide();
    editProductForm.reset();
    await cargarProductos();
    catalogStatus.textContent = 'Producto actualizado correctamente.';
  } catch (error) {
    editProductError.textContent = error.message;
  } finally {
    editProductSubmit.disabled = false;
  }
});

employeeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  employeeStatus.textContent = '';
  employeeError.textContent = '';
  employeeSubmit.disabled = true;

  const formData = new FormData(employeeForm);
  const payload = {
    nombre: String(formData.get('nombre')).trim(),
    email: String(formData.get('email')).trim(),
    password: String(formData.get('password'))
  };

  try {
    await fetchJSON('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    employeeForm.reset();
    employeeStatus.textContent = 'Empleado creado correctamente.';
    await cargarUsuarios();
  } catch (error) {
    employeeError.textContent = error.message;
  } finally {
    employeeSubmit.disabled = false;
  }
});

/** Renderiza el historial en hora/localización venezolana y conserva el orden API. */
async function cargarMovimientos() {
  movementsStatus.textContent = 'Cargando historial…';
  movementsError.textContent = '';

  try {
    const movements = await fetchJSON('/api/movimientos');
    movementsBody.replaceChildren();

    for (const movement of movements) {
      const row = document.createElement('tr');
      const date = new Date(movement.createdAt);
      const values = [
        Number.isNaN(date.getTime())
          ? 'Fecha no disponible'
          : new Intl.DateTimeFormat('es-VE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23'
            }).format(date),
        movement.producto?.nombre ?? 'Producto no disponible',
        movement.tipo === 'ENTRADA' ? 'Entrada' : 'Salida',
        movement.cantidad,
        movement.responsable_proveedor
      ];

      for (const value of values) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.append(cell);
      }
      movementsBody.append(row);
    }

    movementsStatus.textContent = movements.length
      ? `${movements.length} movimiento(s) registrados.`
      : 'No hay movimientos registrados.';
  } catch (error) {
    movementsStatus.textContent = '';
    movementsError.textContent = error.message;
  }
}

/**
 * Mantiene una única lista de categorías para crear y editar productos; si está
 * vacía o falla la petición, desactiva el formulario que depende de ella.
 */
async function cargarCategorias() {
  categoryError.textContent = '';
  productError.textContent = '';

  try {
    const categories = await fetchJSON('/api/categorias');
    categoriasDisponibles = categories;
    const selectedId = newProductCategory.value;
    newProductCategory.replaceChildren(
      new Option('Selecciona una categoría', '')
    );

    for (const category of categories) {
      newProductCategory.add(new Option(category.nombre, String(category.id)));
    }

    if (categories.some((category) => String(category.id) === selectedId)) {
      newProductCategory.value = selectedId;
    }

    const hasCategories = categories.length > 0;
    newProductCategory.disabled = !hasCategories;
    productSubmit.disabled = !hasCategories;
    productCategoryHint.hidden = hasCategories;
  } catch (error) {
    categoryError.textContent = error.message;
    productCategoryHint.hidden = false;
    newProductCategory.disabled = true;
    productSubmit.disabled = true;
  }
}

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  categoryStatus.textContent = '';
  categoryError.textContent = '';
  categorySubmit.disabled = true;

  const formData = new FormData(categoryForm);

  try {
    await fetchJSON('/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: String(formData.get('nombre')).trim() })
    });
    categoryForm.reset();
    await cargarCategorias();
    categoryStatus.textContent = 'Categoría creada correctamente.';
  } catch (error) {
    categoryError.textContent = error.message;
  } finally {
    categorySubmit.disabled = false;
  }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  productStatus.textContent = '';
  productError.textContent = '';
  productSubmit.disabled = true;

  const formData = new FormData(productForm);
  const payload = {
    nombre: String(formData.get('nombre')).trim(),
    categoria_id: Number(formData.get('categoria_id')),
    stock_minimo: Number(formData.get('stock_minimo'))
  };

  try {
    await fetchJSON('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    productForm.reset();
    await Promise.all([cargarProductos(), cargarCategorias()]);
    productStatus.textContent = 'Producto creado correctamente.';
  } catch (error) {
    productError.textContent = error.message;
  } finally {
    productSubmit.disabled = newProductCategory.options.length <= 1;
  }
});

movementForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  movementStatus.textContent = '';
  movementError.textContent = '';
  movementSubmit.disabled = true;

  const formData = new FormData(movementForm);
  const payload = {
    productoId: Number(formData.get('productoId')),
    tipo: formData.get('tipo'),
    cantidad: Number(formData.get('cantidad')),
    responsable_proveedor: String(formData.get('responsable_proveedor')).trim()
  };

  try {
    await fetchJSON('/api/movimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    movementForm.reset();
    // Tras el registro se refrescan en paralelo el saldo/catálogo y el historial,
    // que son las dos vistas afectadas por una entrada o salida.
    await Promise.all([cargarProductos(), cargarMovimientos()]);
    movementStatus.textContent = 'Movimiento registrado; el stock fue actualizado.';
  } catch (error) {
    movementError.textContent = error.message;
  } finally {
    movementSubmit.disabled = false;
  }
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  try {
    await fetchJSON('/api/logout', { method: 'POST' });
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  } catch (error) {
    movementError.textContent = error.message;
  }
});

document.querySelector('#print-movements').addEventListener('click', () => {
  window.print();
});

await Promise.all([cargarCategorias(), cargarProductos(), cargarMovimientos()]);
