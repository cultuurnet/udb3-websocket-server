desc "Build binaries"
task :build do |task|
  system('npm install') or exit 1
  system('cp config.dist.json config.json') or exit 1
end
