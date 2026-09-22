# MOVELO

## MVP de prueba

MOVELO es un marketplace de intermediación de transporte terrestre.

### Flujo de prueba

Cliente publica una necesidad → MOVELO la muestra a transportistas compatibles → cada transportista puede enviar **una oferta** → la subasta cierra a la medianoche del día anterior al viaje → el cliente elige una oferta → se abre un **chat privado** entre cliente y transportista seleccionado → se marca la operación como completada → ambas partes pueden dejar una evaluación.

### Protección de contacto

MOVELO no permite publicar números de teléfono ni secuencias numéricas de 7 o más cifras en los campos protegidos. La comunicación se mantiene dentro de MOVELO.

### Roles

- **Cliente:** publica necesidades y recibe/compara ofertas.
- **Transportista:** configura su perfil, ve oportunidades abiertas y presenta ofertas.
- **Administrador:** acceso privado al Centro de Control; no se muestra como opción pública.

### Seguridad y datos

La aplicación usa Supabase para autenticación, base de datos, RLS, tiempo real y almacenamiento privado de fotos de transportistas.

### Estado actual

Esta versión es un **MVP funcional de beta cerrada**. La base de datos y las reglas principales ya están conectadas. Antes de una salida pública todavía deben validarse en pruebas reales: autenticación, publicación, ofertas, cierre de subasta, aceptación, chat privado, finalización, evaluaciones, fotos y experiencia móvil.

### Importante

No considerar esta versión como una plataforma de transporte pública o de producción masiva todavía. Primero se prueba con un grupo pequeño de usuarios controlados y se corrigen los problemas encontrados.
