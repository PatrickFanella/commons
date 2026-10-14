#!/usr/bin/env bash
set -euo pipefail
chain=COMMONS-INGRESS
iptables -w -N "$chain" 2>/dev/null || true
iptables -w -F "$chain"
iptables -w -A "$chain" -s 10.0.0.200/32 -p tcp -m conntrack --ctorigdst 10.0.0.56 --ctorigdstport 3086 --ctdir ORIGINAL -j RETURN
iptables -w -A "$chain" -p tcp -m conntrack --ctorigdst 10.0.0.56 --ctorigdstport 3086 --ctdir ORIGINAL -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
