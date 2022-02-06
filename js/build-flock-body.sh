#!/usr/bin/env bash
set -o errexit

# Create a container
container=$(buildah from $base)
mountpoint=$(buildah mount $container)
# Labels are part of the "buildah config" command
buildah config --label maintainer="$maintainer" $container

mkdir -p $mountpoint/opt/$name
cp -rf $script_dir/*.sh \
   $script_dir/*.ts \
   $script_dir/*.json \
   $script_dir/.*.json $mountpoint/opt/$name
buildah run $container /opt/$name/build.sh $name

# Entrypoint, too, is a “buildah config” command
buildah config --cmd /opt/$name/run.sh $container

# Finally saves the running container to an image
buildah commit --squash --format docker $container $name:latest
