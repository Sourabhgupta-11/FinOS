# route53.tf — Optional DNS setup via Route53
# Only use if your domain is managed in Route53

# Uncomment and set var.route53_zone_id to enable

# data "aws_route53_zone" "main" {
#   name = var.domain_name
# }

# resource "aws_route53_record" "apex" {
#   zone_id = data.aws_route53_zone.main.zone_id
#   name    = var.domain_name
#   type    = "A"
#   alias {
#     name                   = aws_cloudfront_distribution.main.domain_name
#     zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
#     evaluate_target_health = false
#   }
# }

# resource "aws_route53_record" "www" {
#   zone_id = data.aws_route53_zone.main.zone_id
#   name    = "www.${var.domain_name}"
#   type    = "A"
#   alias {
#     name                   = aws_cloudfront_distribution.main.domain_name
#     zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
#     evaluate_target_health = false
#   }
# }

# If NOT using Route53, point your domain registrar's DNS to:
# CNAME  www     → <cloudfront_domain>.cloudfront.net
# ALIAS  @       → <cloudfront_domain>.cloudfront.net  (or A record if registrar supports ALIAS)
