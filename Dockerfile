# syntax=docker/dockerfile:1
FROM nginx:alpine

# Copy site content
COPY html css js assets index.html /usr/share/nginx/html/

EXPOSE 80

# Default command provided by base image

