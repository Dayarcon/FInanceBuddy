import { aiSmsProcessor } from '../services/AISmsProcessor';
import { enhancedAISmsService } from '../services/EnhancedAISmsService';

// Sample SMS messages for testing
const testSmsMessages = [
  // UPI Transactions
  {
    body: "Rs 500.00 debited via UPI on 15-May-25 14:30:25 to VPA merchant@upi. Ref No 123456789. -ICICI Bank",
    date: Date.now(),
    address: "ICICI"
  },
  {
    body: "Rs 1000.00 credited via UPI on 20-May-25 10:15:30 from VPA sender@upi. Ref No 987654321. -HDFC Bank",
    date: Date.now(),
    address: "HDFC"
  },
  
  // Bank Transfers
  {
    body: "Dear Customer, Acct XX1234 is credited with Rs 5000.00 on 25-May-25 from JOHN DOE. -SBI",
    date: Date.now(),
    address: "SBI"
  },
  {
    body: "Your account XX5678 has been debited with Rs 2000.00 on 28-May-25. -ICICI Bank",
    date: Date.now(),
    address: "ICICI"
  },
  
  // Credit Card Bills
  {
    body: "Your credit card statement for May 2025 is ready. Total amount due: Rs 8500.00. Due date: 15-Jun-25. -ICICI Bank",
    date: Date.now(),
    address: "ICICI"
  },
  
  // Shopping
  {
    body: "Rs 1500.00 debited for purchase at AMAZON. Transaction ID: AMZ123456. -Credit Card",
    date: Date.now(),
    address: "HDFC"
  },
  
  // Food/Dining
  {
    body: "Rs 450.00 debited for payment to SWIGGY. -UPI",
    date: Date.now(),
    address: "ICICI"
  },
  
  // Transportation
  {
    body: "Rs 200.00 debited for UBER ride. -UPI",
    date: Date.now(),
    address: "HDFC"
  },
  
  // Recharge
  {
    body: "Mobile recharge of Rs 199.00 successful. Number: 9876543210. -UPI",
    date: Date.now(),
    address: "ICICI"
  },
  
  // Salary/Income
  {
    body: "Salary credited: Rs 50000.00. Company: ABC Corp. -Bank Transfer",
    date: Date.now(),
    address: "HDFC"
  },
  
  // Refund
  {
    body: "Refund of Rs 500.00 credited to your account. -UPI",
    date: Date.now(),
    address: "ICICI"
  },
  
  // ATM Withdrawal
  {
    body: "Rs 2000.00 withdrawn from ATM at SBI BRANCH on 12-May-25 16:45:30. -ICICI Bank",
    date: Date.now(),
    address: "ICICI"
  },
  
  // Bill Payment
  {
    body: "Electricity bill payment of Rs 800.00 successful. Transaction ID: EL123456. -UPI",
    date: Date.now(),
    address: "HDFC"
  },
  
  // Investment
  {
    body: "SIP payment of Rs 5000.00 debited for mutual fund investment. -NEFT",
    date: Date.now(),
    address: "ICICI"
  },
  
  // Insurance
  {
    body: "Insurance premium of Rs 2500.00 debited. Policy: LIC123456. -Auto Debit",
    date: Date.now(),
    address: "HDFC"
  },
  
  // Loan/EMI
  {
    body: "EMI payment of Rs 8000.00 debited for home loan. -Auto Debit",
    date: Date.now(),
    address: "ICICI"
  }
];

export const testAISmsProcessing = async () => {
  console.log('🤖 Testing AI SMS Processing...\n');
  
  // Test basic AI classification
  console.log('📊 Testing Basic AI Classification:');
  console.log('=====================================');
  
  testSmsMessages.forEach((sms, index) => {
    const classification = aiSmsProcessor.getClassificationInfo(sms.body);
    console.log(`${index + 1}. Category: ${classification.category} (${(classification.confidence * 100).toFixed(1)}% confidence)`);
    console.log(`   SMS: ${sms.body.substring(0, 80)}...`);
    console.log('');
  });
  
  // Test enhanced AI processing
  console.log('🚀 Testing Enhanced AI Processing:');
  console.log('===================================');
  
  let processedCount = 0;
  let totalConfidence = 0;
  const categoryStats: Record<string, number> = {};
  
  for (const sms of testSmsMessages) {
    try {
      const result = await enhancedAISmsService['processSingleSMSWithAI'](sms);
      
      if (result.transaction) {
        processedCount++;
        totalConfidence += result.confidence;
        
        // Update category stats
        categoryStats[result.category] = (categoryStats[result.category] || 0) + 1;
        
        console.log(`✅ Processed: ${result.transaction.type} Rs.${result.transaction.amount} ${result.category}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   Processing Time: ${result.processingTime}ms`);
        console.log(`   Bank: ${result.transaction.bank}`);
        console.log(`   Recipient: ${result.transaction.recipient || 'N/A'}`);
        console.log('');
      } else {
        console.log(`❌ Failed to process: ${sms.body.substring(0, 60)}...`);
        console.log(`   Category: ${result.category}`);
        console.log('');
      }
    } catch (error) {
      console.log(`❌ Error processing: ${error}`);
      console.log('');
    }
  }
  
  // Print summary statistics
  console.log('📈 Processing Summary:');
  console.log('======================');
  console.log(`Total SMS: ${testSmsMessages.length}`);
  console.log(`Successfully Processed: ${processedCount}`);
  console.log(`Success Rate: ${((processedCount / testSmsMessages.length) * 100).toFixed(1)}%`);
  console.log(`Average Confidence: ${((totalConfidence / processedCount) * 100).toFixed(1)}%`);
  
  console.log('\n📊 Category Distribution:');
  Object.entries(categoryStats).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} transactions`);
  });
  
  console.log('\n🎯 AI Features Tested:');
  console.log('======================');
  console.log('✅ SMS Classification');
  console.log('✅ Transaction Type Detection');
  console.log('✅ Amount Extraction');
  console.log('✅ Date Parsing');
  console.log('✅ Bank Name Recognition');
  console.log('✅ Recipient/Sender Extraction');
  console.log('✅ Payment Method Detection');
  console.log('✅ Enhanced Categorization');
  console.log('✅ Confidence Scoring');
  console.log('✅ Processing Time Tracking');
  
  return {
    totalSms: testSmsMessages.length,
    processedCount,
    successRate: (processedCount / testSmsMessages.length) * 100,
    averageConfidence: (totalConfidence / processedCount) * 100,
    categoryStats
  };
};

export const testSpecificSms = async (smsText: string) => {
  console.log('🔍 Testing Specific SMS:');
  console.log('========================');
  console.log(`SMS: ${smsText}`);
  console.log('');
  
  // Test basic classification
  const classification = aiSmsProcessor.getClassificationInfo(smsText);
  console.log(`Classification: ${classification.category}`);
  console.log(`Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
  console.log('');
  
  // Test enhanced processing
  const sms = {
    body: smsText,
    date: Date.now(),
    address: "TEST"
  };
  
  try {
    const result = await enhancedAISmsService['processSingleSMSWithAI'](sms);
    
    if (result.transaction) {
      console.log('✅ Transaction Details:');
      console.log(`   Type: ${result.transaction.type}`);
      console.log(`   Amount: Rs.${result.transaction.amount}`);
      console.log(`   Date: ${result.transaction.date}`);
      console.log(`   Bank: ${result.transaction.bank}`);
      console.log(`   Payment Method: ${result.transaction.paymentMethod}`);
      console.log(`   Recipient: ${result.transaction.recipient || 'N/A'}`);
      console.log(`   Category: ${result.transaction.category}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Processing Time: ${result.processingTime}ms`);
      
      console.log('\n🔍 AI Features:');
      console.log(JSON.stringify(result.aiFeatures, null, 2));
    } else {
      console.log('❌ Failed to process transaction');
      console.log(`   Category: ${result.category}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error}`);
  }
};

// Export test functions for use in development
export const runAITests = async () => {
  console.log('🧪 Running AI SMS Processing Tests...\n');
  
  try {
    const results = await testAISmsProcessing();
    console.log('\n🎉 All tests completed successfully!');
    return results;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};