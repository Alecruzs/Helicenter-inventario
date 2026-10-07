import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Catálogo normalizado para asociar productos con un grupo común y evitar que
// los formularios tengan que repetir nombres de categoría en cada producto.
const Categoria = sequelize.define(
  'Categoria',
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    tableName: 'categorias',
    underscored: true
  }
);

export default Categoria;
