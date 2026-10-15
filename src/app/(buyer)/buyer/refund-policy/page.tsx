
export const metadata = {
  title: "Refund Policy",
  description: "Egoola.com is On Demand Service Platform in Bangladesh. Find Professional Service and Book Now. Order any Service From egoola.com",
};

export default function RefundPolicyPage() {
  return (
    <>
      <div className="container  py-2 ">
          <div className="row ">
              <div className="col-12 py-3 text-center">
                  <h1>Refund Policy</h1>
              </div>
              <div className="px-5 py-3 ">
                  <div className="mb-3">
                      Egoola.com tries its best to serve the users. But if under any circumstances, we fail to fulfill our commitment or to provide the service, we will notify you within 24 hours via phone/ text/ email. If the service, that Egoola.com fails to complete, requires any refund, it&#39;ll be done within 7 Days after our acknowledgement.
                  </div>
                  <p className="font-weight-bold">
                      # Refund requests will be processed under mentioned situation:
                  </p>
                  <ul>
                      <li>
                          – Unable to serve with any service.
                      </li>
                      <li>
                          – Seller cancel any service from a paid order.
                      </li>
                      <li>
                          – Buyer cancels a paid order before it has been accept by seller.
                      </li>
                  </ul>
                  <p className="text-justify">
                      For all the above three scenarios, the refund amount will be sent to Egoola.com Balance of the customer. And the balance can only be used to purchase at Egoola.com. Upon customer’s request, Egoola.com will transfer the refund amount to the user’s original payment source within 7 days. Refund is only allowed for customers who have paid via bKash or card or other electronic method. For the orders that are paid via Cash, refund is only to be given through Egoola.com Credits.
                  </p>
              </div>
          </div>
      </div>
    </>
  );
}
