#!/bin/bash

# AWS Cost Monitoring Setup Script
# This script helps set up billing alerts and cost monitoring for AWS

echo "📊 AWS Cost Monitoring Setup"
echo "=============================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed."
    echo "   Please install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS credentials are not configured."
    echo "   Please run: aws configure"
    exit 1
fi

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account ID: $ACCOUNT_ID"
echo ""

# Check if budgets are enabled
echo "📋 Setting up cost monitoring..."
echo ""

# Create budget configuration file
BUDGET_CONFIG_FILE=$(mktemp)
cat > "$BUDGET_CONFIG_FILE" <<EOF
{
  "BudgetName": "Chess2Pgn-Development-Budget",
  "BudgetLimit": {
    "Amount": "10",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKeyValue": [
      "user:Project$Chess2Pgn"
    ]
  }
}
EOF

# Create notifications configuration file
NOTIFICATIONS_FILE=$(mktemp)
cat > "$NOTIFICATIONS_FILE" <<EOF
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "YOUR_EMAIL@example.com"
      }
    ]
  },
  {
    "Notification": {
      "NotificationType": "FORECASTED",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "YOUR_EMAIL@example.com"
      }
    ]
  }
]
EOF

echo "⚠️  Note: This script creates configuration files but requires manual steps:"
echo ""
echo "1. Enable Billing Alerts in AWS Console:"
echo "   https://console.aws.amazon.com/billing/home#/preferences"
echo ""
echo "2. Create a Budget using AWS Console (recommended):"
echo "   https://console.aws.amazon.com/billing/home#/budgets/create"
echo ""
echo "3. Or use AWS CLI to create budget (advanced):"
echo "   aws budgets create-budget --account-id $ACCOUNT_ID --budget file://$BUDGET_CONFIG_FILE"
echo ""
echo "📊 Recommended Budget Settings:"
echo "   - Budget amount: \$10/month"
echo "   - Alert at 50%: \$5"
echo "   - Alert at 80%: \$8"
echo "   - Alert at 100%: \$10"
echo ""
echo "📧 Update email in $NOTIFICATIONS_FILE before using with AWS CLI"
echo ""
echo "✅ Cost monitoring configuration files created:"
echo "   Budget config: $BUDGET_CONFIG_FILE"
echo "   Notifications: $NOTIFICATIONS_FILE"
echo ""
echo "📖 For detailed instructions, see COST_OPTIMIZATION.md"

