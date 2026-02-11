terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "fleet_agent" {
  image  = "ubuntu-22-04-x64"
  name   = "fleet-agent-${var.agent_name}"
  region = var.region
  size   = "s-1vcpu-1gb"
  tags   = ["clawtrace"]

  user_data = <<-EOF
    #!/bin/bash
    curl -sL https://clawtrace.dev/install | bash -s -- --key=${var.fleet_key} --agent-id=${var.agent_id}
  EOF
}

variable "do_token" {
  description = "DigitalOcean API Token"
  sensitive   = true
}

variable "region" {
  description = "Region to deploy the agent"
  default     = "nyc1"
}

variable "agent_name" {
  description = "Name for the agent droplet"
  default     = "01"
}

variable "fleet_key" {
  description = "ClawTrace API Key"
  sensitive   = true
}

variable "agent_id" {
  description = "ClawTrace Agent ID (optional, auto-generated if not provided)"
  default     = ""
}
