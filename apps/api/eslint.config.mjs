import { docento } from '@docento/config/eslint'

export default docento({
  ignores: [
    // Generated OpenAPI output, not hand-edited source.
    'src/utils/swagger_output.json',
    'src/types/**/*.d.ts',
    // Generated Prisma client, not hand-edited source.
    'src/generated/**',
  ],
})
