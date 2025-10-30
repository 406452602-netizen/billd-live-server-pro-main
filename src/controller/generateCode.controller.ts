// eslint-disable-next-line import/no-extraneous-dependencies
import archiver from 'archiver';
import { ParameterizedContext } from 'koa';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import sequelize from '@/config/mysql';
import { COMMON_HTTP_CODE } from '@/constant';
import { CustomError } from '@/model/customError.model';

// 辅助函数：将字符串转换为小驼命名法
function toCamelCase(str: string) {
  return str.replace(/[-_]([a-z])/g, (_, char) => char.toUpperCase());
}

// 辅助函数：将字符串转换为大驼命名法
function toPascalCase(str: string) {
  const camelCaseStr = toCamelCase(str);
  return camelCaseStr.charAt(0).toUpperCase() + camelCaseStr.slice(1);
}

// 查询数据库表
// eslint-disable-next-line require-await,@typescript-eslint/require-await
async function getTables() {
  const queryInterface = sequelize.getQueryInterface();
  return queryInterface.showAllTables();
}

// 生成 types 文件内容
function generateTypesFile(tableName: string, columns: any) {
  const pascalCaseTableName = toPascalCase(tableName);
  let content = `export interface I${pascalCaseTableName} {\n`;
  Object.keys(columns).forEach((columnName) => {
    const columnTypeMatch = columns[columnName].type.toString().match(/^(\w+)/);
    const columnType = columnTypeMatch
      ? columnTypeMatch[1].toUpperCase()
      : 'UNKNOWN';
    let tsType = 'any';
    if (
      [
        'INT',
        'INTEGER',
        'BIGINT',
        'TINYINT',
        'SMALLINT',
        'MEDIUMINT',
        'FLOAT',
        'DOUBLE',
        'DECIMAL',
      ].includes(columnType)
    ) {
      tsType = 'number';
    } else if (
      [
        'STRING',
        'TEXT',
        'CHAR',
        'VARCHAR',
        'DATE',
        'DATETIME',
        'TIMESTAMP',
        'TIME',
        'YEAR',
      ].includes(columnType)
    ) {
      tsType = 'string';
    } else if (columnType === 'BOOLEAN') {
      tsType = 'boolean';
    }
    content += `  ${columnName}${
      columns[columnName].allowNull || columns[columnName].primaryKey ? '?' : ''
    }: ${tsType};\n`;
  });
  content += `}\n`;
  return content;
}

// 生成 model 文件内容
function generateModelFile(tableName: string, columns: any) {
  const pascalCaseTableName = toPascalCase(tableName);
  toCamelCase(tableName);
  let attributes = '';
  Object.keys(columns).forEach((columnName) => {
    const columnType = columns[columnName].type.toString();
    let sequelizeType = 'DataTypes.STRING';
    if (
      [
        'INT',
        'INTEGER',
        'TINYINT',
        'SMALLINT',
        'MEDIUMINT',
        'FLOAT',
        'DOUBLE',
        'DECIMAL',
      ].includes(columnType)
    ) {
      sequelizeType = 'DataTypes.INTEGER';
    } else if (/BIGINT/i.test(columnType)) {
      sequelizeType = 'DataTypes.BIGINT';
    } else if (/BOOLEAN/i.test(columnType)) {
      sequelizeType = 'DataTypes.BOOLEAN';
    } else if (/TEXT/i.test(columnType)) {
      sequelizeType = 'DataTypes.TEXT';
    } else if (/DATE/i.test(columnType)) {
      sequelizeType = 'DataTypes.DATE';
    } else if (/VARCHAR/i.test(columnType)) {
      const lengthMatch = columnType.match(/VARCHAR\((\d+)\)/);
      if (lengthMatch) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        sequelizeType = `DataTypes.STRING(${lengthMatch[1]})`;
      } else {
        sequelizeType = 'DataTypes.STRING';
      }
    }

    attributes += `    ${columnName}: {\n`;
    attributes += `      type: ${sequelizeType},\n`;
    if (columns[columnName].primaryKey) {
      attributes += `      primaryKey: true,\n`;
    }
    if (columns[columnName].autoIncrement) {
      attributes += `      autoIncrement: true,\n`;
    }
    if (columns[columnName].allowNull !== undefined) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      attributes += `      allowNull: ${columns[columnName].allowNull},\n`;
    }
    if (
      columns[columnName].defaultValue !== undefined &&
      !columns[columnName].primaryKey
    ) {
      attributes += `      defaultValue: ${JSON.stringify(
        columns[columnName].defaultValue
      )},\n`;
    }
    attributes = attributes.replace(/,\n$/, '\n    },\n');
  });

  return `// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { I${pascalCaseTableName} } from '@/types/I${pascalCaseTableName}';

interface ${pascalCaseTableName}Model
  extends Model<InferAttributes<${pascalCaseTableName}Model>, InferCreationAttributes<${pascalCaseTableName}Model>>,
    I${pascalCaseTableName} {}

const model = sequelize.define<${pascalCaseTableName}Model>(
  '${tableName}',
  {
${attributes}  },
  {
    hooks: {
      // https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/other-topics/hooks.md
      // afterValidate(instance: any) {
      //   if (instance.changed('password')) {
      //     // eslint-disable-next-line no-param-reassign
      //     instance.password = MD5(instance.password).toString();
      //   }
      // },
    },
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

initTable({ model, sequelize });

export default model;
`;
}

// 生成 service 文件内容
function generateServiceFile(tableName: string, columns: any) {
  const pascalCaseTableName = toPascalCase(tableName);
  const camelCaseTableName = toCamelCase(tableName);
  // 获取主键字段名
  const primaryKeyColumn = Object.keys(columns).find(
    (columnName) => columns[columnName].primaryKey
  );
  if (!primaryKeyColumn) {
    throw new Error(`Table ${tableName} has no primary key`);
  }

  return `import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';
// 从生成的 types 文件导入接口
import { I${pascalCaseTableName} } from '@/types/I${pascalCaseTableName}';
import ${pascalCaseTableName}Model from '@/model/${camelCaseTableName}.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class ${pascalCaseTableName}Service {
  /** ${pascalCaseTableName} 是否存在 */
  async isExist(ids: number[]) {
    const res = await ${pascalCaseTableName}Model.count({
      where: {
        ${primaryKeyColumn}: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 ${pascalCaseTableName} */
  async create(data: I${pascalCaseTableName}) {
    return ${pascalCaseTableName}Model.create(data);
  }

  /** 查找 ${pascalCaseTableName} */
  async find(${primaryKeyColumn}: number) {
    return ${pascalCaseTableName}Model.findOne({ where: { ${primaryKeyColumn} } });
  }

  /** 获取 ${pascalCaseTableName} 列表 */
  async getList({
    ${primaryKeyColumn},
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: {
    ${primaryKeyColumn}?: number;
    orderBy?: string;
    orderName?: string;
    nowPage?: number;
    pageSize?: number;
    keyWord?: string;
    rangTimeType?: string;
    rangTimeStart?: string;
    rangTimeEnd?: string;
  }) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      ${primaryKeyColumn},
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['name', 'desc'], // 可根据实际表结构调整
    });
    if (keyWordWhere) {
      allWhere[Op.or] = keyWordWhere;
    }
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    if (rangTimeWhere) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }
    const orderRes = handleOrder({ orderName, orderBy });
    const result = await ${pascalCaseTableName}Model.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 ${pascalCaseTableName} */
  async update(${primaryKeyColumn}: number, data: Partial<I${pascalCaseTableName}>) {
    const [affectedRows] = await ${pascalCaseTableName}Model.update(data, { where: { ${primaryKeyColumn} }, limit: 1 });
    return affectedRows > 0;
  }

  /** 删除 ${pascalCaseTableName} */
  async delete(${primaryKeyColumn}: number) {
    const deletedRows = await ${pascalCaseTableName}Model.destroy({ where: { ${primaryKeyColumn} }, limit: 1 });
    return deletedRows > 0;
  }
}

export default new ${pascalCaseTableName}Service();
`;
}

// 生成 controller 文件内容
function generateControllerFile(tableName: string, columns: any) {
  const pascalCaseTableName = toPascalCase(tableName);
  const camelCaseTableName = toCamelCase(tableName);
  // 获取主键字段名
  const primaryKeyColumn = Object.keys(columns).find(
    (columnName) => columns[columnName].primaryKey
  );
  if (!primaryKeyColumn) {
    throw new Error(`Table ${tableName} has no primary key`);
  }

  return `import { ParameterizedContext } from 'koa';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
// 从生成的 types 文件导入接口
import { I${pascalCaseTableName} } from '@/types/I${pascalCaseTableName}';
import { CustomError } from '@/model/customError.model';
import ${pascalCaseTableName}Service from '@/service/${camelCaseTableName}.service';

class ${pascalCaseTableName}Controller {
  create = async (ctx: ParameterizedContext, next) => {
    const data: I${pascalCaseTableName} = ctx.request.body;
    const result = await ${pascalCaseTableName}Service.create(data);
    successHandler({ ctx, data: result });
    await next();
  }

  find = async (ctx: ParameterizedContext, next) => {
    const ${primaryKeyColumn} = +ctx.params.${primaryKeyColumn};
    const result = await ${pascalCaseTableName}Service.find(${primaryKeyColumn});
    if (!result) {
      throw new CustomError({
        msg: \`不存在${primaryKeyColumn}为\${${primaryKeyColumn}}的${camelCaseTableName}记录！\`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError
      });
    }
    successHandler({ ctx, data: result });
    await next();
  }

  getList = async (ctx: ParameterizedContext, next) => {
    const data = ctx.request.query;
    const result = await ${pascalCaseTableName}Service.getList(data);
    successHandler({ ctx, data: result });
    await next();
  }

  update = async (ctx: ParameterizedContext, next) => {
    const ${primaryKeyColumn} = +ctx.params.${primaryKeyColumn};
    const data: Partial<I${pascalCaseTableName}> = ctx.request.body;
    const isUpdated = await ${pascalCaseTableName}Service.update(${primaryKeyColumn}, data);
    if (!isUpdated) {
      throw new CustomError({
        msg: \`更新${primaryKeyColumn}为\${${primaryKeyColumn}}的${camelCaseTableName}记录失败！\`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError
      });
    }
    successHandler({ ctx, data: { message: \`${primaryKeyColumn}为\${${primaryKeyColumn}}的${camelCaseTableName}记录更新成功\` } });
    await next();
  }

  delete = async (ctx: ParameterizedContext, next) => {
    const ${primaryKeyColumn} = +ctx.params.${primaryKeyColumn};
    const isDeleted = await ${pascalCaseTableName}Service.delete(${primaryKeyColumn});
    if (!isDeleted) {
      throw new CustomError({
        msg: \`删除${primaryKeyColumn}为\${${primaryKeyColumn}}的${camelCaseTableName}记录失败！\`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError
      });
    }
    successHandler({ ctx, data: { message: \`${primaryKeyColumn}为\${${primaryKeyColumn}}的${camelCaseTableName}记录删除成功\` } });
    await next();
  }
}

export default new ${pascalCaseTableName}Controller();
`;
}

// 生成 router 文件内容
function generateRouterFile(tableName: string, columns: any) {
  const pascalCaseTableName = toPascalCase(tableName);
  const camelCaseTableName = toCamelCase(tableName);
  // 获取主键字段名
  const primaryKeyColumn = Object.keys(columns).find(
    (columnName) => columns[columnName].primaryKey
  );
  if (!primaryKeyColumn) {
    throw new Error(`Table ${tableName} has no primary key`);
  }
  return `import Router from 'koa-router';
import ${pascalCaseTableName}Controller from '@/controller/${camelCaseTableName}.controller';

const ${camelCaseTableName}Router = new Router({ prefix: '/${camelCaseTableName}' });

${camelCaseTableName}Router.post('/', ${pascalCaseTableName}Controller.create);
${camelCaseTableName}Router.get('/:${primaryKeyColumn}', ${pascalCaseTableName}Controller.find);
${camelCaseTableName}Router.get('/', ${pascalCaseTableName}Controller.getList);
${camelCaseTableName}Router.put('/:${primaryKeyColumn}', ${pascalCaseTableName}Controller.update);
${camelCaseTableName}Router.delete('/:${primaryKeyColumn}', ${pascalCaseTableName}Controller.delete);

export default ${camelCaseTableName}Router;
`;
}

class GenerateCodeController {
  generateAndDownload = async (ctx: ParameterizedContext, next) => {
    try {
      const { tables } = ctx.query;
      let targetTables: string[];

      if (tables) {
        targetTables = Array.isArray(tables) ? tables : tables.split(',');
      } else {
        const allTables = await getTables();
        targetTables = allTables;
      }

      const archive = archiver('zip', { zlib: { level: 9 } });

      ctx.response.type = 'application/zip';
      ctx.response.attachment('generated-files.zip');
      archive.pipe(ctx.res);

      for (let i = 0; i < targetTables.length; i += 1) {
        const tableName = targetTables[i];
        const pascalCaseTableName = toPascalCase(tableName);
        const camelCaseTableName = toCamelCase(tableName);
        // eslint-disable-next-line no-await-in-loop
        const columns = await sequelize
          .getQueryInterface()
          .describeTable(tableName);
        const typesContent = generateTypesFile(tableName, columns);
        const modelContent = generateModelFile(tableName, columns);
        const serviceContent = generateServiceFile(tableName, columns);
        const controllerContent = generateControllerFile(tableName, columns);
        const routerContent = generateRouterFile(tableName, columns);

        archive.append(typesContent, {
          name: `src/types/I${pascalCaseTableName}.ts`,
        });
        archive.append(modelContent, {
          name: `src/model/${camelCaseTableName}.model.ts`,
        });
        archive.append(serviceContent, {
          name: `src/service/${camelCaseTableName}.service.ts`,
        });
        archive.append(controllerContent, {
          name: `src/controller/${camelCaseTableName}.controller.ts`,
        });
        archive.append(routerContent, {
          name: `src/router/${camelCaseTableName}.router.ts`,
        });
      }

      await archive.finalize();
    } catch (error) {
      console.error(error);
      throw new CustomError({
        msg: '生成文件失败',
        httpStatusCode: COMMON_HTTP_CODE.serverError,
        errorCode: COMMON_HTTP_CODE.serverError,
      });
    }
    await next();
  };
}

export default new GenerateCodeController();
