import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Logo from "../components/Logo";

export default function TermsConditionsPage() {
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
            Terms & Conditions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: April 2026
          </p>

          <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Terms of Service
              </h2>
              <p>
                By accessing and using FinOS, you accept and agree to be bound
                by the terms and provision of this agreement. If you do not
                agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Use License
              </h2>
              <p className="mb-4">
                Permission is granted to temporarily download one copy of the
                materials (information or software) on FinOS for personal,
                non-commercial transitory viewing only. This is the grant of a
                license, not a transfer of title, and under this license you may
                not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Modify or copy the materials</li>
                <li>
                  Use the materials for any commercial purpose or for any public
                  display
                </li>
                <li>
                  Attempt to decompile or reverse engineer any software
                  contained on FinOS
                </li>
                <li>
                  Remove any copyright or other proprietary notations from the
                  materials
                </li>
                <li>
                  Transfer the materials to another person or "mirror" the
                  materials on any other server
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Disclaimer
              </h2>
              <p>
                FinOS is a personal finance tracking and analytics platform. We
                provide financial insights and dashboards to help users
                understand their finances. FinOS does not provide investment
                advice or financial advisory services. All financial data and
                analytics are for informational purposes only and should not be
                considered as professional financial advice. Users are
                responsible for their own financial decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Limitations of Liability
              </h2>
              <p>
                In no event shall FinOS or its suppliers be liable for any
                damages (including, without limitation, damages for loss of data
                or profit, or due to business interruption) arising out of the
                use or inability to use FinOS, even if FinOS or an authorized
                representative has been notified orally or in writing of the
                possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Accuracy of Materials
              </h2>
              <p>
                The materials appearing on FinOS could include technical,
                typographical, or photographic errors. We do not warrant that
                any of the materials on FinOS are accurate, complete, or
                current.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                User Responsibilities
              </h2>
              <p className="mb-4">As a user of FinOS, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate information</li>
                <li>
                  Maintain the confidentiality of your account credentials
                </li>
                <li>
                  Not use the platform for illegal or unauthorized purposes
                </li>
                <li>Not attempt to gain unauthorized access to the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Modifications
              </h2>
              <p>
                We may revise these terms of service for FinOS at any time
                without notice. By using FinOS you are agreeing to be bound by
                the then current version of these terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Governing Law
              </h2>
              <p>
                These terms and conditions are governed by and construed in
                accordance with the laws of India, and you irrevocably submit to
                the exclusive jurisdiction of the courts in that location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Contact
              </h2>
              <p>
                If you have any questions about these Terms & Conditions, please
                contact us at{" "}
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
