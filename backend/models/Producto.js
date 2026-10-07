import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Existencia actual y umbral de alerta viven junto al producto; los movimientos
// son la vía transaccional para modificar stock después de su alta inicial.
const Producto = sequelize.define(
  'Producto',
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    stock_actual: {
      // Alta inicial en cero; el servicio de movimientos mantiene el saldo después.
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    stock_minimo: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: 'productos',
    underscored: true
  }
);

export default Producto;
