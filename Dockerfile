# Dockerfile simple - fichiers pré-buildés
FROM nginx:alpine

# Copier les fichiers buildés
COPY dist/ /usr/share/nginx/html/

# Config nginx pour SPA React
COPY nginx.coolify.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
