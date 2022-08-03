# eby-gde

Aplicación para seguimiento personalizado de expedientes

## Pre-requisitos

### NodeJS

El proyecto requiere ejecutarse en una version especifica de NodeJS, definida en el archivo .nvmrc

Puede utilizar [nvm](https://github.com/nvm-sh/nvm) si utiliza un equipo con MacOS o Linux.

Si su equipo es Windows, puede instalar [nvm-windows](https://github.com/coreybutler/nvm-windows), con la salvedad de no poder hacer uso del archivo .nvmrc (debera elegir manualmente la version de nodejs).

### Oracle instant client

El sdk de oracle para NodeJs requiere que el cliente [instantclient](https://www.oracle.com/database/technologies/instant-client.html) se encuentre instalado en su maquina. Descargue la ultima version, y mueva el contenido a la ubicacion **C:\oracle\instantclient_xx_xx**. Tambien debera agregar esta ruta al final de la variable de entorno PATH de windows (o su S.O.).

### Postgres

Para desarrollo local es necesario instalar el motor Postgres, y luego crear una base de datos y un usuario con la informacion contenida en el archivo ./backend/config/database.js. Este proceso es automatico si se utiliza docker, pero no asi con desarrollo local.

### Variables de entorno

Si desea lanzar los contenedores docker, debera definir un solo archivo .env en la raiz del proyecto, siguiendo el ejemplo del archivo .env.example provisto.

Para desarrollo local, tanto el directorio frontend como backend poseen sus respectivos .env.example para guias.

### Certificados (para despliegue de docker local)

Si desea desplegar la aplicacion y utilizarla en modo productivo con su FQDN, debera crear una carpeta **certs** en la raiz del proyecto, cuyo contenido sera el certificado chained y su key.

Localmente debera agregar una entrada a su archivo de hosts de esta manera:

<su IP local> expedientes.eby.org.ar
<su IP local> gdeapi.eby.org.ar


