#!/usr/bin/env bash

set -o errexit

# Create a container
container=$(buildah from fedora)
mountpoint=$(buildah mount $container)
script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
name=flock-base-js

# Labels are part of the "buildah config" command
buildah config --label maintainer="Joseph C Wang <joe@pigeonchain.co>" $container
buildah run $container dnf install -y --setopt=install_weak_deps=False tar gzip gcc make nodejs npm git

# Entrypoint, too, is a “buildah config” command
buildah config --port 3000/tcp $container
buildah config --port 3001/tcp $container

# Finally saves the running container to an image
buildah commit --squash --format docker $container $name:latest
