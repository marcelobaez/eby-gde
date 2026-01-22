# Base on offical NGINX Alpine image
FROM nginx:alpine

# Remove any existing config files
RUN rm /etc/nginx/conf.d/*

# Copy template file
COPY ./default.conf.template /etc/nginx/templates/default.conf.template

# Expose the listening port
EXPOSE 80

# Launch NGINX
# nginx:alpine automatically processes templates in /etc/nginx/templates/
# and substitutes environment variables using envsubst
CMD [ "nginx", "-g", "daemon off;" ]