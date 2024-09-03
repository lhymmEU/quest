"use client";

import { useState, useEffect } from "react";
import FullQuestCard from "./FullQuestCard";
import SubmissionCard from "./SubmissionCard";
import { Program } from "@/lib/infoQuest";
import {
  web3Enable,
  web3Accounts,
  web3FromSource,
} from "@polkadot/extension-dapp";

const QuestDetails = ({ gearApi, title, infoQuestId }) => {
  const [fullQuestDetails, setFullQuestDetails] = useState(null);
  const [parsedSubmissions, setParsedSubmissions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [connected, setConnected] = useState(false);
  // Retrieve detailed information for display, including quest details and submission details.
  const infoQuest = new Program(gearApi, infoQuestId);

  useEffect(() => {
    const readFullQuests = async () => {
      // Load the program
      const questRes = await infoQuest.infoQuestSvc.getQuest(title);
      const submissionRes = await infoQuest.infoQuestSvc.getSubmissions(title);
      setFullQuestDetails(questRes);
      // Parse submission result
      const parsed = [];
      for (const [participant, submission] of Object.entries(
        submissionRes.map
      )) {
        parsed.push({
          participant,
          submission,
          status: submissionRes.status[participant],
        });
      }
      setParsedSubmissions(parsed);
      console.log(parsed);
    };

    readFullQuests();
  }, [title]);

  const connectWallet = async () => {
    try {
      // Enable the Polkadot.js extension
      const extensions = await web3Enable("My Gear App");
      if (extensions.length === 0) {
        console.log("No extension found");
        return;
      }

      // Get all accounts from the extension
      const allAccounts = await web3Accounts();
      setAccounts(allAccounts);

      if (allAccounts.length > 0) {
        setSelectedAccount(allAccounts[0]);
        setConnected(true);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleAccountChange = (event) => {
    const account = accounts.find((acc) => acc.address === event.target.value);
    setSelectedAccount(account);
  };

  // Participant submit to the quest
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const submission = formData.get("submission");
    const transaction = infoQuest.infoQuestSvc.submit(submission, title);
    const injector = await web3FromSource(selectedAccount.meta.source);
    transaction.withAccount(selectedAccount.address, {
      signer: injector.signer,
    });
    await transaction.calculateGas();
    const { msgId, blockHash, response } = await transaction.signAndSend();

    await response();
  };

  const handleApprove = async (participant) => {
    const transaction = infoQuest.infoQuestSvc.decide(
      participant,
      "approved",
      title
    );
    const injector = await web3FromSource(selectedAccount.meta.source);
    transaction.withAccount(selectedAccount.address, {
      signer: injector.signer,
    });
    await transaction.calculateGas();
    const { msgId, blockHash, response } = await transaction.signAndSend();

    await response();
  };

  const handleReject = async (participant) => {
    const transaction = infoQuest.infoQuestSvc.decide(
      participant,
      "rejected",
      title
    );
    const injector = await web3FromSource(selectedAccount.meta.source);
    transaction.withAccount(selectedAccount.address, {
      signer: injector.signer,
    });
    await transaction.calculateGas();
    const { msgId, blockHash, response } = await transaction.signAndSend();

    await response();
  };

  const handleClose = async (title) => {
    const transaction = infoQuest.infoQuestSvc.close(title);
    const injector = await web3FromSource(selectedAccount.meta.source);
    transaction.withAccount(selectedAccount.address, {
      signer: injector.signer,
    });
    await transaction.calculateGas();
    const { msgId, blockHash, response } = await transaction.signAndSend();

    await response();
  };

  return (
    <div className="flex flex-col">
      <div>
        <h2>Gear Wallet Connection</h2>
        {!connected ? (
          <button onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <div>
            <p>Connected Account: {selectedAccount?.address}</p>
            <select onChange={handleAccountChange}>
              {accounts.map((account) => (
                <option key={account.address} value={account.address}>
                  {account.meta.name || "Unnamed Account"} ({account.address})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex">
        {fullQuestDetails ? (
          <div>
            <FullQuestCard
              status={fullQuestDetails.quest_status}
              rewardAmount={fullQuestDetails.reward_amount}
              title={title}
              deadline={fullQuestDetails.deadline}
              publisher={fullQuestDetails.publisher_id}
              description={fullQuestDetails.description}
              submissionType={fullQuestDetails.submission_type}
              requirements={fullQuestDetails.submission_requirements}
            />

            <form onSubmit={handleSubmit}>
              <input type="text" name="submission"></input>
              <button type="submit">Submit</button>
            </form>

            <button onClick={() => handleClose(title)}>Close Quest</button>
          </div>
        ) : (
          <p>Loading...</p>
        )}
        <ul>
          {parsedSubmissions.length != 0 ? (
            parsedSubmissions.map((parsedSubmission) => (
              <li key={parsedSubmission.participant}>
                <SubmissionCard
                  participant={parsedSubmission.participant}
                  link={parsedSubmission.submission}
                  decision={parsedSubmission.status}
                />
                <button
                  onClick={() => handleApprove(parsedSubmission.participant)}
                  className="rounded-full text-custom-primary text-sm bg-custom-accent px-4 py-1"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(parsedSubmission.participant)}
                  className="rounded-full text-custom-primary text-sm bg-custom-accent px-4 py-1"
                >
                  Reject
                </button>
              </li>
            ))
          ) : (
            <p>No submissions yet.</p>
          )}
        </ul>
      </div>
    </div>
  );
};

export default QuestDetails;
