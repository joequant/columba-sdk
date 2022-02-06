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

buildah config --workingdir /opt/$name $container
buildah run $container npm install

if [ -f $script_dir/build.sh ] ; then
    buildah run $container /opt/$name/build.sh $name
fi

buildah run $container sh -c 'rm /etc/dnf/protected.d/*'
buildah run $container npm prune --production
buildah run $container npm cache clean --force
buildah run $container dnf autoremove -y \
	tar gcc make git npm shadow-utils sudo vim-minimal
buildah run $container dnf clean all

# Entrypoint, too, is a “buildah config” command
buildah config --cmd /opt/$name/run.sh $container

# Finally saves the running container to an image
buildah commit --squash --format docker $container $name:latest
