# MOVELO

MOVELO es una plataforma de intermediación de transporte terrestre.

## Flujo principal

Cliente publica una necesidad → MOVELO la muestra a transportistas compatibles → cada transportista puede enviar una oferta → el cliente elige una oferta → se abre un chat privado entre cliente y transportista seleccionado → se marca la operación como completada → ambas partes pueden dejar una evaluación.

## Protección de contacto

MOVELO no permite publicar números de teléfono ni secuencias numéricas de 7 o más cifras en los campos protegidos. La comunicación se mantiene dentro de MOVELO.

## Roles

- **Cliente:** publica necesidades y recibe/compara ofertas.
- **Transportista:** configura su perfil, ve oportunidades abiertas y presenta ofertas.
- **Administrador:** acceso privado al Centro de Control; no se muestra como opción pública.

## Seguridad y datos

La aplicación usa Supabase para autenticación, base de datos, RLS, tiempo real y almacenamiento privado de fotos de transportistas.

## Estado

La aplicación está en fase de validación controlada antes de una apertura pública. Se deben validar de extremo a extremo autenticación, publicación, ofertas, aceptación, chat privado, finalización, evaluaciones, fotos y experiencia móvil.

## Regla de trabajo

No se considera lista para uso masivo hasta completar las pruebas reales y corregir los fallos encontrados.
