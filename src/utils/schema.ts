import Ajv from 'ajv'

export function addCustomSchemas (schemaValidator: Ajv, schemas: any) {
  for (const schema in schemas) {
    schemaValidator.addSchema(schemas[schema], `#/components/schemas/${schema}`)
  }
}
