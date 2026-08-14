"use client";

import React, { useState } from "react";
import { Modal } from "../../../components/ui/modal";
import { Button } from "../../../components/ui/button";
import {
  Building2,
  Users,
  User,
  Tag,
  Briefcase,
  CheckCircle,
} from "lucide-react";

interface DeviceClaimWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  deviceHostname: string;
}

export function DeviceClaimWizard({
  open,
  onClose,
  onComplete,
  deviceHostname,
}: DeviceClaimWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    dept: "",
    team: "",
    owner: "",
    tags: "",
    bu: "",
  });

  const nextStep = () => setStep((s) => Math.min(6, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleFinish = () => {
    // API call would go here to claim the device
    onComplete();
  };

  const steps = [
    { id: 1, title: "Department", icon: Building2 },
    { id: 2, title: "Team", icon: Users },
    { id: 3, title: "Owner", icon: User },
    { id: 4, title: "Tags", icon: Tag },
    { id: 5, title: "Business Unit", icon: Briefcase },
    { id: 6, title: "Finish", icon: CheckCircle },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Claim Device: ${deviceHostname}`}
      size="lg"
    >
      <div className="py-4">
        {/* Progress indicator */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -z-10" />
          {steps.map((s) => (
            <div key={s.id} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === s.id
                    ? "border-blue-500 bg-gray-900 text-blue-500"
                    : step > s.id
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-700 bg-gray-900 text-gray-500"
                }`}
              >
                <s.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase mt-2 text-gray-400 font-semibold">
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Forms */}
        <div className="min-h-[200px]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">
                Assign to Department
              </h3>
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                value={data.dept}
                onChange={(e) => setData({ ...data, dept: e.target.value })}
              >
                <option value="">Select Department...</option>
                <option value="engineering">Engineering</option>
                <option value="finance">Finance</option>
                <option value="hr">Human Resources</option>
              </select>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Assign to Team</h3>
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                value={data.team}
                onChange={(e) => setData({ ...data, team: e.target.value })}
              >
                <option value="">Select Team...</option>
                <option value="frontend">Frontend Web</option>
                <option value="backend">Backend Services</option>
                <option value="accounting">Accounting</option>
              </select>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Assign Owner</h3>
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                value={data.owner}
                onChange={(e) => setData({ ...data, owner: e.target.value })}
              >
                <option value="">Select User...</option>
                <option value="john">John Doe</option>
                <option value="sarah">Sarah Jenkins</option>
              </select>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">
                Add Metadata Tags
              </h3>
              <input
                type="text"
                placeholder="e.g. home-lab, media-server, dev-pc"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                value={data.tags}
                onChange={(e) => setData({ ...data, tags: e.target.value })}
              />
            </div>
          )}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">
                Select Workspace Category
              </h3>
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                value={data.bu}
                onChange={(e) => setData({ ...data, bu: e.target.value })}
              >
                <option value="">Select Category...</option>
                <option value="homelab">Home Lab & Edge</option>
                <option value="developer">Developer Workstations</option>
              </select>
            </div>
          )}
          {step === 6 && (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">Ready to Claim</h3>
              <p className="text-gray-400">
                Review the assignments. The device will be moved from UNASSIGNED
                to the target workspace structure.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={prevStep} disabled={step === 1}>
            Back
          </Button>
          {step < 6 ? (
            <Button
              onClick={nextStep}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Complete Claim
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
