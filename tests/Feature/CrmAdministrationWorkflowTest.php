<?php
namespace Tests\Feature;
use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
class CrmAdministrationWorkflowTest extends TestCase
{
 use RefreshDatabase;
 protected function setUp(): void {
  parent::setUp();
  $id=DB::table('admins')->insertGetId(['email'=>'admin@example.test','name'=>'Admin','password_hash'=>bcrypt('secret'),'role'=>'admin','created_at'=>now(),'updated_at'=>now()]);
  $this->withHeader('Authorization','Bearer '.AdminToken::make(DB::table('admins')->find($id)));
 }
 public function test_delivery_report_filters_the_same_creation_cohort_as_summary(): void {
  $contact=$this->postJson('/api/admin/crm/contacts',['name'=>'Report contact','email'=>'report@example.test'])->assertOk()->json('contact.id');
  foreach (['2026-09-30 23:59:59','2026-10-01 00:00:00','2026-10-30 23:59:59','2026-10-31 00:00:00'] as $date) {
   $campaign=DB::table('crm_campaigns')->insertGetId(['name'=>'Report '.$date,'subject'=>'Subject','body'=>'Content','status'=>'sent','created_at'=>$date,'updated_at'=>$date]);
   DB::table('crm_campaign_deliveries')->insert(['campaign_id'=>$campaign,'contact_id'=>$contact,'status'=>'sent','created_at'=>$date,'updated_at'=>$date,'sent_at'=>'2026-10-31 12:00:00']);
  }
  $this->getJson('/api/admin/crm/email-activities?start=2026-10-01&end=2026-10-30')->assertOk()->assertJsonCount(2);
  $this->getJson('/api/admin/crm/dashboard?start=2026-10-01&end=2026-10-30')->assertOk()->assertJsonPath('performance.sent',2);
  $this->getJson('/api/admin/crm/email-activities?end=2026-09-30')->assertOk()->assertJsonCount(1);
  $this->getJson('/api/admin/crm/email-activities?start=2026-10-31')->assertOk()->assertJsonCount(1);
  $this->getJson('/api/admin/crm/email-activities')->assertOk()->assertJsonCount(4);
  $this->getJson('/api/admin/crm/email-activities?start=2026-10-31&end=2026-10-01')->assertUnprocessable();
  $this->getJson('/api/admin/crm/email-activities?start=invalid')->assertUnprocessable();
 }
 public function test_renamed_list_keeps_membership_and_contact_filter_matches_count(): void {
  $contact=$this->postJson('/api/admin/crm/contacts',['name'=>'Audience contact','email'=>'audience@example.test'])->assertOk()->json('contact.id');
  $list=$this->postJson('/api/admin/crm/segments',['kind'=>'list','name'=>'Original'])->assertOk()->json('id');
  $this->putJson("/api/admin/crm/contacts/{$contact}/segments",['segment_ids'=>[$list]])->assertOk();
  $this->putJson("/api/admin/crm/segments/{$list}",['kind'=>'list','name'=>'Renamed'])->assertOk();
  $this->getJson('/api/admin/crm/segments')->assertOk()->assertJsonFragment(['name'=>'Renamed','contacts'=>1]);
  $this->getJson('/api/admin/crm/contacts?segment_id='.$list)->assertOk()->assertJsonPath('contacts.total',1)->assertJsonPath('contacts.data.0.id',$contact);
 }

 public function test_delivery_activity_paginates_and_counts_all_filtered_records(): void {
  $contact=$this->postJson('/api/admin/crm/contacts',['name'=>'Log contact','email'=>'log@example.test'])->assertOk()->json('contact.id');
  for ($i=0;$i<31;$i++) {
   $campaign=DB::table('crm_campaigns')->insertGetId(['name'=>'Log campaign '.$i,'subject'=>'Subject','body'=>'Body','status'=>'sent','created_at'=>now(),'updated_at'=>now()]);
   DB::table('crm_campaign_deliveries')->insert(['campaign_id'=>$campaign,'contact_id'=>$contact,'status'=>$i<28?'sent':'failed','error'=>$i<28?null:'Transport unavailable','created_at'=>now(),'updated_at'=>now()]);
  }
  $this->getJson('/api/admin/crm/email-activities?page=1')->assertOk()->assertJsonCount(25,'data')->assertJsonPath('total',31)->assertJsonPath('counts.sent',28)->assertJsonPath('counts.failed',3)->assertJsonPath('data.0.contact_id',$contact);
  $this->getJson('/api/admin/crm/email-activities?page=2')->assertOk()->assertJsonCount(6,'data');
  $this->getJson('/api/admin/crm/email-activities?page=1&status=failed&search=log%40example.test')->assertOk()->assertJsonCount(3,'data')->assertJsonPath('total',3)->assertJsonPath('counts.failed',3)->assertJsonPath('data.0.error','Transport unavailable');
  $this->getJson('/api/admin/crm/email-activities?page=1&search=missing')->assertOk()->assertJsonPath('total',0);
  $this->getJson('/api/admin/crm/email-activities?page=0')->assertUnprocessable();
  $this->getJson('/api/admin/crm/email-activities?page=1&status=unknown')->assertUnprocessable();
 }

 public function test_saved_audience_can_include_all_contacts_without_conditions(): void {
  $this->postJson('/api/admin/crm/contacts',['name'=>'Everyone','email'=>'everyone@example.test'])->assertOk();
  $id=$this->postJson('/api/admin/crm/saved-segments',['name'=>'All contacts','filters'=>[]])->assertOk()->json('id');
  $this->getJson('/api/admin/crm/saved-segments')->assertOk()->assertJsonFragment(['id'=>$id,'contacts'=>DB::table('crm_contacts')->count()]);
 }
}
