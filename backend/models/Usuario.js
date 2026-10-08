import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Cuenta de acceso y autorización RBAC. Este modelo almacena únicamente hashes
// de contraseña creados por bcrypt, nunca la contraseña original.
const Usuario = sequelize.define(
  'Usuario',
  {
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      },
      // Uniforma la clave natural del usuario antes de persistirla o consultarla,
      // de modo que mayúsculas y espacios no creen identidades duplicadas.
      set(value) {
        this.setDataValue('email', value.trim().toLowerCase());
      }
    },
    password: {
      type: DataTypes.STRING(60),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    rol: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'empleado',
      validate: {
        isIn: [['admin', 'empleado', 'almacenista', 'mecanico']]
      }
    }
  },
  {
    tableName: 'usuarios',
    underscored: true
  }
);

export default Usuario;
