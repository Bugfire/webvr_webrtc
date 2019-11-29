#

.PHONY: $(shell egrep -o ^[a-zA-Z_-]+: $(MAKEFILE_LIST) | sed 's/://')

help: ## This help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install services
	cp momo.service /etc/systemd/system/
	cp folo.service /etc/systemd/system/

enable: install ## Enable services
	systemctl enable momo.service
	systemctl enable folo.service

start: install ## Start services
	systemctl start momo.service
	systemctl start folo.service

disable: ## Disable services
	systemctl disable momo.service
	systemctl disable folo.service

stop: ## Stop services
	systemctl start momo.service
	systemctl start folo.service
