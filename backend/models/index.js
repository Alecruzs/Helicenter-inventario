import sequelize from '../config/database.js';
import Categoria from './Categoria.js';
import Producto from './Producto.js';
import Movimiento from './Movimiento.js';
import Usuario from './Usuario.js';

// Categorías y productos mantienen una relación obligatoria. RESTRICT evita
// dejar productos sin clasificación al intentar borrar una categoría utilizada.
Categoria.hasMany(Producto, {
  as: 'productos',
  foreignKey: {
    name: 'categoria_id',
    allowNull: false
  },
  onDelete: 'RESTRICT'
});
Producto.belongsTo(Categoria, {
  as: 'categoria',
  foreignKey: {
    name: 'categoria_id',
    allowNull: false
  },
  onDelete: 'RESTRICT'
});

// Los movimientos son evidencia permanente del inventario: RESTRICT impide
// eliminar un producto ya referenciado y mantiene íntegro su historial.
Producto.hasMany(Movimiento, {
  as: 'movimientos',
  foreignKey: {
    name: 'producto_id',
    allowNull: false
  },
  onDelete: 'RESTRICT'
});
Movimiento.belongsTo(Producto, {
  as: 'producto',
  foreignKey: {
    name: 'producto_id',
    allowNull: false
  },
  onDelete: 'RESTRICT'
});

export { sequelize, Categoria, Producto, Movimiento, Usuario };
export default { sequelize, Categoria, Producto, Movimiento, Usuario };
