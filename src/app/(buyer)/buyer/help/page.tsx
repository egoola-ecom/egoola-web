import Link from "next/link";
import { FaqAccordion, FaqItem, FaqLink } from "@/components/shop/faq";

export const metadata = {
  title: "Help & Support",
  description: "Egoola.com is On Demand Service Platform in Bangladesh. Find Professional Service and Book Now. Order any Service From egoola.com",
};

export default function HelpPage() {
  return (
    <>
      <div className="container  py-2 ">
          <div className="row ">
              <div className="col-12 py-3 text-center">
                  <h1>Help &amp; Support</h1>
                  <div className="mt-3">
                      <h3>Get answers to the most frequently asked question</h3>
                  </div>
              </div>
              <div className="col px-5 py-5">
      <FaqAccordion>
<FaqItem id={1} title="1. How do I sign up for a seller or buyer account on egoola.com?">

      <div className="card-body  text-justify">
          Signing up for an account on Egoola.com is quick, easy, and completely free! To sign up on Egoola.com, please go to the <Link href="/login" className="text-success" >Sign Up</Link> page and follow the instructions. You can sign up with your phone number or email address or through your Facebook account.
      </div>
</FaqItem>
<FaqItem id={2} title="2. How do I log in and log out of my account?">

      <div className="card-body  text-justify">
        To log in to your account, simply go to the <Link href="/login" className="text-success" > Sign in </Link> page and enter your email or Phone Number and Egoola.com password. If you have created an account via Facebook, click on “Continue with Facebook” Or if you have created an account via mail then click on “Continue with mail” and follow the instructions.
        <div className="py-1">
            To log out of your account, simply click the “Sign out” option.
        </div>
      </div>
</FaqItem>
<FaqItem id={3} title="3. How do I set a new password on egoola.com?">

      <div className="card-body  text-justify">
        To set a new Egoola.com password, please <Link href="/login" className="text-success">log in</Link>  to your account, go to the <span className="text-success">Dashboard</span> select “setting” and click on “Change password”
        <div className="py-1">
            Then enter your current password. Type a new password, and confirm password. And click to “Update password” button.
        </div>
      </div>
</FaqItem>
<FaqItem id={4} title="4. Forget my Password!">

      <div className="card-body  text-justify">
        If you have forgotten your Egoola.com password, you can:
        <ul className="">
            <li className="disc-list ml-4 text-justify">
                Go to the Sign in page and click on the “ <Link href="/login" className="text-success">Forget password</Link> ” link
            </li>
            <li className="disc-list ml-4  text-justify">
                Enter your phone number or Email address. Then click to “Send reset OTP” Button.
            </li>
            <li className="disc-list ml-4  text-justify">
                	Type a password &amp; confirm password, then click to “Reset password” Button.
            </li>
        </ul>
        <div className="">
            If you have created an account via Facebook or Mail, you will not have an Egoola.com password. You can Sign in to your account via Facebook or Mail without a password.
        </div>
      </div>
</FaqItem>
<FaqItem id={5} title="5. How do I change my account details / Information?">

      <div className="card-body  text-justify">
        To change the details or information on your account, <Link href="/login" className="text-success">Sign in</Link> to your account and go to your Dashboard &amp; click on the “<span className="text-success">Edit</span>” icon near your profile picture.
      </div>
</FaqItem>
<FaqItem id={6} title="6. How do I post a Service?">

      <div className="card-body  text-justify">
        Posting a service on Egoola.com is quick and easy!
        <div className="py-1">
            Go to your <span className="text-success">Dashboard</span>, click the “Add “Another Service” Button and follow the instructions. If you are not already logged in, you will need <Link href="/login" className="text-success">log in</Link> as the first step of posting your services. Your services will go live once it has been reviewed.
        </div>
      </div>
</FaqItem>
<FaqItem id={7} title="7. How do I post a project?">

      <div className="card-body  text-justify">
        Posting a project on Egoola.com is quick and easy!
        <div className="py-1">At first confirm you are <Link href="/buyer" className="text-success">  Switch on buyer</Link>. Then go to your <span className="text-success">Dashboard</span>, click the “Post My Project” Button and follow the instructions.</div>
        <div className="py-1">
            If you are not already logged in, you will need <Link href="/login" className="text-success">log in</Link> as the first step of posting your Project.
        </div>
        <div className="py-1">Your project will go live once it has been reviewed.</div>
      </div>
</FaqItem>
<FaqItem id={8} title="8. How do I edit my service or project?">

      <div className="card-body  text-justify">
        To edit your service or project, please go to your <span className="text-success">Dashboard</span> and select “<span className="text-success">Active service</span>” (if you are switch on seller) or “<span className="text-success">Active project</span>” (if you are switch on buyer) then click on the “Edit” option.
        <div className="py-1">After editing your service or project it will be again under review to the Egoola team. Wait for approval. </div>
      </div>
</FaqItem>
<FaqItem id={10} title="9. How do I delete my service or project?">

      <div className="card-body  text-justify">
          After submitting your service or project it will be under review on the Egoola team.
          <br />To delete your service, please go to your <span className="text-success">Dashboard</span>,
          <div className="py-1">After editing your service or project it will be again under review to the Egoola team. Wait for approval. </div>
          <div className="my-3">
              <b>To delete your service</b>
              <ul>
                  <li className="disc-list ml-4 my-1 text-justify">
                      Click on “<span className="text-success">Post service</span>” then select “<span className="text-success">under review service</span>” and click on the “Delete” option which service you want to delete.
                  </li>
              </ul>
              <b>To delete your project</b>
              <ul>
                  <li className="disc-list ml-4 my-1 text-justify">
                      Click on “<span className="text-success">Post project</span>” then select “<span className="text-success">under review project</span>” and click on the “Delete” option which project you want to delete.
                  </li>
              </ul>
          </div>
          <div className="py-1">
              After approving your service or project you can’t delete it. You can deactive your service or project. If you deactive any service or project it will not show anyone. <FaqLink to={9}>Click Here</FaqLink> to know how to deactive any active service or project.
          </div>
          <div className="py-1">
              Also, you can re-active your service or project any time. <FaqLink to={11}>Click Here</FaqLink> to know how to active any Deactive service or project.
          </div>
      </div>
</FaqItem>
<FaqItem id={9} title="10. How do I Deactive any service or project?">

      <div className="card-body  text-justify">
          <div className="my-3">
              If you want any service to deactive, at first go to your <span className="text-success">Dashboard</span> then
              <ul>
                  <li className="disc-list ml-4 my-1 text-justify">
                      Click on “<span className="text-success">Post service</span>” then select “<span className="text-success">Active service</span>” and click on the “Deactive” option which service you want to Deactive.
                  </li>
              </ul>
              If you want any project to deactive, at first go to your <span className="text-success">Dashboard</span> then
              <ul>
                  <li className="disc-list ml-4 my-1 text-justify">
                      Click on “<span className="text-success">Post service</span>” then select “<span className="text-success">Active service</span>” and click on the “Deactive” option which project you want to Deactive.
                  </li>
              </ul>
          </div>
      </div>
</FaqItem>
<FaqItem id={11} title="11. How do I Active my Deactive Service or project?">

      <div className="card-body  text-justify">
          <div className="my-3">
              If you want re-active your service, go to your <span className="text-success">Dashboard</span> then
              <ul>
                  <li className="disc-list ml-4 my-1 text-justify">
                      Click on “<span className="text-success">Post service</span>” then select “<span className="text-success">Deactive service</span>” and click on the “Active” option which service you want to active.
                  </li>
              </ul>
              If you want re-active your project, go to your <span className="text-success">Dashboard</span> then
              <ul>
                  <li className="disc-list ml-4 my-1 text-justify">
                      Click on “<span className="text-success">Post project</span>” then select “<span className="text-success">Deactive project</span>” and click on the “Active” option which project you want to active.
                  </li>
              </ul>
          </div>
      </div>
</FaqItem>
<FaqItem id={12} title="12. Why my service or project has been rejected?">

      <div className="card-body  text-justify">
          All of the service or project are manually reviewed by Egoola team. If your service or project violates our <FaqLink to={13}>Posting rules</FaqLink> it will be rejected.
          <div className="my-2">
              You will be notified via notification why your service or project have been rejected.
          </div>
      </div>
</FaqItem>
<FaqItem id={13} title="13. What are the rules for posting service or project on Egoola.com">

      <div className="card-body  text-justify">
          <ul>
              <li className="disc-list ml-4 my-1">Service or project that is illegal in Bangladesh.</li>
              <li className="disc-list ml-4 my-1">Invalid information.</li>
              <li className="disc-list ml-4 my-1">Sensitive content.</li>
              <li className="disc-list ml-4 my-1">An unrealistic offer.</li>
              <li className="disc-list ml-4 my-1">Offensive language.</li>
              <li className="disc-list ml-4 my-1">Text in the title or description that is not related to the service or project.</li>
              <li className="disc-list ml-4 my-1">Images that do not match or clearly show the service or project.</li>
          </ul>
      </div>
</FaqItem>
<FaqItem id={14} title="14. I haven’t received any responses to my service or project!">

      <div className="card-body  text-justify">
          If you are not receiving responses to your service or project, please check if your service or project is correct in our <FaqLink to={13}>posting rules</FaqLink> . If it is correct then you can contact our support team.
      </div>
</FaqItem>
<FaqItem id={15} title="15. For more support please mail us on our email!">

      <div className="card-body  text-justify">
        <span className="">Email: </span> <span className="text-success">info@egoola.com, support@egoola.com</span>
      </div>
</FaqItem>
      </FaqAccordion>

              </div>
          </div>
      </div>
    </>
  );
}
