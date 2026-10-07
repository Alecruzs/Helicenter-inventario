import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Registro histórico de entradas y salidas. El movimiento conserva la cantidad,
// el tipo y la referencia del responsable/proveedor para auditoría operativa.
const Movimiento = sequelize.define(
  'Movimiento',
  {
    tipo: {
      // Enum del dominio: evita persistir tipos distintos de entrada/salida.
      type: DataTypes.ENUM('ENTRADA', 'SALIDA'),
      allowNull: false
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    responsable_proveedor: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    tableName: 'movimientos',
    underscored: true
  }
);

export default Movimiento;
