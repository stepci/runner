export function addCustomSchemas(schemaValidator, schemas) {
    for (const schema in schemas) {
        schemaValidator.addSchema(schemas[schema], `#/components/schemas/${schema}`);
    }
}
