desc "Build binaries"
task :build do |task|
  system('yarn install --production') or exit 1
  system('touch config.json') or exit 1
end
