# XIIGen Infrastructure

## SSL / TLS

SSL is terminated at the ALB. Zero code changes required.

Setup:
1. Request ACM certificate for `*.xiigen.com` in AWS Certificate Manager.
2. In ALB console: add HTTPS listener on port 443, attach ACM certificate.
3. Add redirect rule: HTTP 80 → HTTPS 443 (ALB level, not nginx).
4. ALB forwards decrypted traffic to ECS containers on port 80/3000.

DNS:
- Route53: `*.xiigen.com` ALIAS → ALB DNS name
- Route53: `xiigen.com` ALIAS → ALB DNS name

Result: All tenants at [tenant].xiigen.com get HTTPS automatically.
No certificate renewal needed (ACM handles it).

## Carry-forward

```
CF-DEPLOY-1: GitHub secrets must be configured before deploy.yml can run.
             Required: AWS_ACCOUNT_ID, AWS_REGION, ECR_REGISTRY, ECS_CLUSTER,
                       AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
             Action: configure in GitHub repo Settings → Secrets and variables → Actions.

CF-DEPLOY-2: ECS cluster, ALB, and Route53 wildcard must be provisioned before
             first deploy. Run infra/scripts/setup-ecr.sh for ECR repos.
             ALB + Route53 are manual console steps (or add Terraform in a future FLOW).

CF-DEPLOY-3: ACM certificate for *.xiigen.com must be validated in AWS before
             HTTPS listener can be added to ALB.
             Action: request in ACM, validate via DNS CNAME in Route53.

CF-DEPLOY-4: Subdomain routing (SubdomainTenantMiddleware) requires
             SUBDOMAIN_BASE_DOMAIN=xiigen.com in server environment (already set
             in infra/ecs/server-task-definition.json). Verify Route53 wildcard
             *.xiigen.com → ALB is in place before enabling.
```

## Quick start (first deploy)

```bash
export AWS_ACCOUNT_ID=<your-account-id>
export AWS_REGION=us-east-1

# 1. Create ECR repositories and log groups (one-time)
./infra/scripts/setup-ecr.sh

# 2. Deploy manually (or let CI/CD trigger via deploy.yml)
export ECR_REGISTRY=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
export ECS_CLUSTER=xiigen-prod
export IMAGE_TAG=$(git rev-parse --short HEAD)
./infra/scripts/deploy.sh all
```
