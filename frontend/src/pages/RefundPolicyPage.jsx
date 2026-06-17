import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Logo from "../components/Logo";

export default function RefundPolicyPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              FinOS
            </span>
          </div>
          <div className="w-12" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 md:p-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Refund Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: April 2026
          </p>

          <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Overview
              </h2>
              <p>
                FinOS is committed to customer satisfaction. This Refund Policy
                outlines the terms and conditions for refunds on subscription
                purchases.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Subscription Refunds
              </h2>
              <p className="mb-4">
                We offer a 7-day money-back guarantee on all subscription plans:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Refunds are available within 7 days of the initial purchase
                </li>
                <li>Request refunds by contacting finos.support@gmail.com</li>
                <li>Refunds will be processed within 5-10 business days</li>
                <li>Refunds are issued to the original payment method</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Recurring Subscriptions
              </h2>
              <p className="mb-4">For recurring subscription plans:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  You can cancel your subscription anytime from your account
                  settings
                </li>
                <li>
                  Cancellation is effective at the end of your billing period
                </li>
                <li>No refund will be issued for the current billing period</li>
                <li>
                  You will continue to have access until your billing period
                  ends
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Non-Refundable Items
              </h2>
              <p className="mb-4">
                The following are not eligible for refunds:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Subscriptions cancelled beyond 7 days of purchase</li>
                <li>Subscriptions that have been renewed automatically</li>
                <li>Refunds requested after the 7-day guarantee period</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                How to Request a Refund
              </h2>
              <p className="mb-4">To request a refund:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Contact our support team at finos.support@gmail.com</li>
                <li>Include your account email and order details</li>
                <li>Specify the reason for your refund request</li>
                <li>Our team will review and respond within 2 business days</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Processing Time
              </h2>
              <p>
                Once a refund is approved, it may take 5-10 business days for
                the amount to appear in your original payment method, depending
                on your bank or payment provider.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Exceptions
              </h2>
              <p>
                We reserve the right to deny refunds in cases of fraudulent
                activity, misuse of the platform, or violation of our Terms &
                Conditions. Each case will be reviewed individually.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Contact Support
              </h2>
              <p>
                For refund-related inquiries or complaints, please contact us at{" "}
                <a
                  href="mailto:finos.support@gmail.com"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  finos.support@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
