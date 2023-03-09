"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCustomSchemas = void 0;
function addCustomSchemas(schemaValidator, schemas) {
    for (const schema in schemas) {
        schemaValidator.addSchema(schemas[schema], `#/components/schemas/${schema}`);
    }
}
exports.addCustomSchemas = addCustomSchemas;
