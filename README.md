# MOVELO

MOVELO es una plataforma de intermediación de transporte terrestre.

## Flujo principal

Cliente publica una necesidad → MOVELO la muestra a transportistas compatibles → cada transportista puede enviar una oferta → el cliente elige una oferta cuando cierra la ventana de cotización → se abre un chat privado entre cliente y transportista seleccionado → ambas partes marcan su parte como completada → ambas pueden dejar una evaluación.

## Protección de contacto

MOVELO no permite publicar números de teléfono ni secuencias numéricas de 7 o más cifras en los campos protegidos. La comunicación se mantiene dentro de MOVELO.

## Roles

- **Cliente:** publica necesidades y recibe/compara ofertas.
- **Transportista:** configura su perfil, presenta documentación para verificación y, una vez aprobado, puede presentar ofertas.
- **Administrador:** acceso privado al Centro de Control; no se muestra como opción pública.

## Seguridad y datos

La aplicación usa Supabase para autenticación, base de datos, RLS, tiempo real y almacenamiento privado de fotos y documentos de transportistas.

Las reglas de base de datos también impiden que un transportista no aprobado pueda cotizar directamente aunque intente saltarse la interfaz.

## Estado

MOVELO está preparado para una apertura pública inicial con tráfico controlado y seguimiento de errores. El flujo operativo principal está implementado: autenticación, publicación, cotización, aceptación, chat protegido, finalización por ambas partes y evaluaciones.

## Regla de trabajo

La apertura pública no significa que el sistema esté terminado. Se seguirá corrigiendo con datos reales de uso, sin cambiar innecesariamente la URL pública.

**URL pública actual:** https://movelo-k5c7.vercel.app/
